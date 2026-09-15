import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGymLogDatabase } from '../db/database-factory'
import { DATABASE_VERSION, type GymLogDatabase } from '../db/gym-log-database'
import { ExerciseFamilyRepository } from './exercise-family-repository'
import { ExerciseRepository } from './exercise-repository'
import { WorkoutRepository } from './workout-repository'

const externalSchema = {
  reps: 'REQUIRED',
  load: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
} as const

const bodyweightSchema = { ...externalSchema, load: 'OPTIONAL' } as const

describe('GymLog repositories', () => {
  let database: GymLogDatabase
  let families: ExerciseFamilyRepository
  let exercises: ExerciseRepository
  let workouts: WorkoutRepository

  beforeEach(async () => {
    database = createGymLogDatabase(`GymLog-test-${crypto.randomUUID()}`)
    await database.open()
    families = new ExerciseFamilyRepository(database)
    exercises = new ExerciseRepository(database)
    workouts = new WorkoutRepository(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('declares schema v1 and the approved query indexes', () => {
    expect(database.verno).toBe(DATABASE_VERSION)
    expect(
      Object.hasOwn(database.exerciseBlocks.schema.idxByName, '[sessionId+order]'),
    ).toBe(true)
    expect(
      Object.hasOwn(database.exerciseBlocks.schema.idxByName, '[exerciseId+sessionId]'),
    ).toBe(true)
    expect(
      Object.hasOwn(database.exerciseRecords.schema.idxByName, '[exerciseBlockId+order]'),
    ).toBe(true)
  })

  it('creates optional-family exercises and preserves current names for historical references', async () => {
    const reverseHyperFamily = await families.create({ name: '反向山羊' })
    const reverseHyper = await exercises.create({
      name: '反向山羊挺身',
      familyId: reverseHyperFamily.id,
      recordSchema: bodyweightSchema,
      loadMode: 'BODYWEIGHT_PLUS',
    })
    const hangingLegRaise = await exercises.create({
      name: '悬垂举腿',
      recordSchema: { ...externalSchema, load: 'DISABLED' },
      loadMode: 'NONE',
    })
    const session = await workouts.createSession({
      date: '2026-09-08',
      startTime: '18:10',
    })
    await workouts.addExerciseBlock(session.id, reverseHyper.id)

    await exercises.rename(reverseHyper.id, '反向山羊挺身（器械）')
    const detail = await workouts.getWorkoutById(session.id)

    expect(hangingLegRaise.familyId).toBeUndefined()
    expect(detail?.blocks[0].exercise.name).toBe('反向山羊挺身（器械）')
  })

  it('archives historical exercises but hard-deletes exercises without history', async () => {
    const benchPress = await exercises.create({
      name: '卧推',
      recordSchema: externalSchema,
      loadMode: 'EXTERNAL',
    })
    const unusedExercise = await exercises.create({
      name: '绳索面拉',
      recordSchema: externalSchema,
      loadMode: 'EXTERNAL',
    })
    const session = await workouts.createSession({ date: '2026-09-09' })
    await workouts.addExerciseBlock(session.id, benchPress.id)

    expect(await exercises.delete(benchPress.id)).toBe('archived')
    expect((await exercises.getById(benchPress.id))?.archived).toBe(true)
    expect(await exercises.delete(unusedExercise.id)).toBe('hard-deleted')
    expect(await exercises.getById(unusedExercise.id)).toBeUndefined()
  })

  it('archives and restores families while protecting referenced families from hard deletion', async () => {
    const reverseHyperFamily = await families.create({ name: '反向山羊' })
    const archived = await families.archive(reverseHyperFamily.id)
    const restored = await families.restore(reverseHyperFamily.id)
    await exercises.create({
      name: '反向山羊举手',
      familyId: reverseHyperFamily.id,
      recordSchema: bodyweightSchema,
      loadMode: 'BODYWEIGHT_PLUS',
    })

    expect(archived.archived).toBe(true)
    expect(restored.archived).toBe(false)
    await expect(families.hardDelete(reverseHyperFamily.id)).rejects.toThrow(
      'cannot be hard deleted',
    )
  })

  it('preserves duplicate exercise blocks, record order, and real training records', async () => {
    const benchPress = await exercises.create({
      name: '卧推',
      recordSchema: externalSchema,
      loadMode: 'EXTERNAL',
    })
    const session = await workouts.createSession({
      date: '2026-09-10',
      startTime: '18:12',
      endTime: '19:31',
    })
    const firstBenchBlock = await workouts.addExerciseBlock(session.id, benchPress.id)
    const secondBenchBlock = await workouts.addExerciseBlock(session.id, benchPress.id)

    await workouts.addExerciseRecord(firstBenchBlock.id, { load: 30, reps: 12 })
    await workouts.addExerciseRecord(firstBenchBlock.id, { load: 35, reps: 12 })
    await workouts.addExerciseRecord(firstBenchBlock.id, { load: 40, reps: 8 })
    await workouts.addExerciseRecord(firstBenchBlock.id, { load: 45, reps: 4 })
    await workouts.addExerciseRecord(firstBenchBlock.id, { load: 40, reps: 6 })

    const detail = await workouts.getWorkoutById(session.id)

    expect(detail?.blocks.map(({ block }) => block.order)).toEqual([0, 1])
    expect(detail?.blocks.map(({ block }) => block.exerciseId)).toEqual([
      benchPress.id,
      benchPress.id,
    ])
    expect(detail?.blocks[0].records.map((record) => record.order)).toEqual([
      0, 1, 2, 3, 4,
    ])
    expect(secondBenchBlock.order).toBe(1)
  })

  it('cascades records when blocks and sessions are removed', async () => {
    const assistedPullUp = await exercises.create({
      name: '辅助引体',
      recordSchema: externalSchema,
      loadMode: 'ASSISTANCE',
    })
    const session = await workouts.createSession({ date: '2026-09-11' })
    const block = await workouts.addExerciseBlock(session.id, assistedPullUp.id)
    const record = await workouts.addExerciseRecord(block.id, { load: 50, reps: 10 })

    await workouts.removeExerciseBlock(block.id)
    expect(await database.exerciseRecords.get(record.id)).toBeUndefined()

    const secondBlock = await workouts.addExerciseBlock(session.id, assistedPullUp.id)
    const secondRecord = await workouts.addExerciseRecord(secondBlock.id, {
      load: 45,
      reps: 7,
    })
    await workouts.deleteWorkoutSession(session.id)

    expect(await database.workoutSessions.get(session.id)).toBeUndefined()
    expect(await database.exerciseBlocks.get(secondBlock.id)).toBeUndefined()
    expect(await database.exerciseRecords.get(secondRecord.id)).toBeUndefined()
  })

  it('supports nullable session end times and the approved indexed date query', async () => {
    const unfinished = await workouts.createSession({
      date: '2026-09-12',
      startTime: '20:07',
    })
    await workouts.createSession({
      date: '2026-09-14',
      startTime: '18:06',
      endTime: '19:15',
    })
    const completed = await workouts.updateWorkoutTime(unfinished.id, {
      date: '2026-09-12',
      startTime: '20:07',
      endTime: '21:18',
    })

    const sessions = await workouts.listSessionsByDateRange('2026-09-12', '2026-09-14')

    expect(sessions).toHaveLength(2)
    expect(completed.endTime).toBe('21:18')
    expect(sessions.find((session) => session.date === '2026-09-12')?.endTime).toBe(
      '21:18',
    )
  })

  it('rejects an exercise schema with an incompatible load mode', async () => {
    await expect(
      exercises.create({
        name: '未定义重量的卧推',
        recordSchema: { ...externalSchema, load: 'DISABLED' },
        loadMode: 'EXTERNAL',
      }),
    ).rejects.toThrow('requires NONE load mode')
  })

  it('keeps persisted data after the database is reopened', async () => {
    const benchPress = await exercises.create({
      name: '卧推',
      recordSchema: externalSchema,
      loadMode: 'EXTERNAL',
    })
    const databaseName = database.name

    database.close()
    database = createGymLogDatabase(databaseName)
    await database.open()

    expect((await database.exercises.get(benchPress.id))?.name).toBe('卧推')
  })

  it('updates an exercise without changing its id or rewriting historical records', async () => {
    const reverseHyper = await exercises.create({
      name: '反向山羊挺身',
      recordSchema: bodyweightSchema,
      loadMode: 'BODYWEIGHT_PLUS',
    })
    const session = await workouts.createSession({ date: '2026-09-15' })
    const block = await workouts.addExerciseBlock(session.id, reverseHyper.id)
    const historicalRecord = await workouts.addExerciseRecord(block.id, { reps: 20 })

    const updated = await exercises.update(reverseHyper.id, {
      name: '反向山羊挺身（器械）',
      recordSchema: { ...bodyweightSchema, side: 'OPTIONAL' },
      loadMode: 'BODYWEIGHT_PLUS',
    })

    expect(updated.id).toBe(reverseHyper.id)
    expect(updated.name).toBe('反向山羊挺身（器械）')
    expect(
      (await database.exerciseRecords.get(historicalRecord.id))?.side,
    ).toBeUndefined()
    expect((await workouts.getWorkoutById(session.id))?.blocks[0].exercise.id).toBe(
      reverseHyper.id,
    )
  })

  it('allows only empty families to be permanently deleted', async () => {
    const emptyFamily = await families.create({ name: '空动作族' })
    await families.hardDelete(emptyFamily.id)

    expect(await families.getById(emptyFamily.id)).toBeUndefined()
  })

  it('keeps pull-down variations as separate exercises', async () => {
    const names = ['宽距正手高位下拉', '窄距正手高位下拉', '窄距反手高位下拉']
    const variations = await Promise.all(
      names.map((name) =>
        exercises.create({
          name,
          recordSchema: externalSchema,
          loadMode: 'EXTERNAL',
        }),
      ),
    )

    expect(new Set(variations.map((variation) => variation.id)).size).toBe(3)
    expect(variations.map((variation) => variation.name)).toEqual(names)
  })

  it('allows a family to be deleted after its exercises are moved to ungrouped', async () => {
    const family = await families.create({ name: '高位下拉' })
    const exercise = await exercises.create({
      name: '宽距正手高位下拉',
      familyId: family.id,
      recordSchema: externalSchema,
      loadMode: 'EXTERNAL',
    })

    await exercises.update(exercise.id, {
      name: exercise.name,
      recordSchema: exercise.recordSchema,
      loadMode: exercise.loadMode,
    })
    await families.hardDelete(family.id)

    expect((await exercises.getById(exercise.id))?.familyId).toBeUndefined()
    expect(await families.getById(family.id)).toBeUndefined()
  })
})
