import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGymLogDatabase } from '../data/db/database-factory'
import { ExerciseRepository } from '../data/repositories/exercise-repository'
import { GymLogDatabase } from '../data/db/gym-log-database'
import { calculateWorkoutDuration } from '../domain/workout/duration'
import { WorkoutLoggingService } from './workout-logging-service'

const benchSchema = {
  reps: 'REQUIRED',
  load: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
} as const

describe('WorkoutLoggingService', () => {
  let database: GymLogDatabase
  let service: WorkoutLoggingService
  let exercises: ExerciseRepository
  beforeEach(async () => {
    database = createGymLogDatabase(`workout-${crypto.randomUUID()}`)
    await database.open()
    service = new WorkoutLoggingService(database)
    exercises = new ExerciseRepository(database)
  })
  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists, resumes, copies, and cancels a real bench press session', async () => {
    const bench = await exercises.create({
      name: '卧推',
      recordSchema: benchSchema,
      loadMode: 'EXTERNAL',
    })
    const session = await service.createSession({
      date: '2026-09-11',
      startTime: '18:17',
    })
    const block = await service.addBlock(session.id, bench.id)
    const first = await service.addRecord(block.id, { load: 40, reps: 8 })
    await service.addRecord(block.id, { load: first.load, reps: first.reps })
    expect((await service.listUnfinishedSessions()).map((value) => value.id)).toContain(
      session.id,
    )
    expect(
      (await service.getWorkout(session.id))?.blocks[0].records.map(
        (value) => value.order,
      ),
    ).toEqual([0, 1])
    await service.cancelSession(session.id)
    expect(await service.getWorkout(session.id)).toBeUndefined()
    expect(await database.exerciseBlocks.get(block.id)).toBeUndefined()
  })

  it('keeps bodyweight records load-free and finds prior exercise performance', async () => {
    const reverseHyper = await exercises.create({
      name: '反向山羊挺身',
      recordSchema: { ...benchSchema, load: 'OPTIONAL' },
      loadMode: 'BODYWEIGHT_PLUS',
    })
    const prior = await service.createSession({
      date: '2026-09-10',
      startTime: '18:00',
      endTime: '19:00',
    })
    const priorBlock = await service.addBlock(prior.id, reverseHyper.id)
    await service.addRecord(priorBlock.id, { reps: 20 })
    const current = await service.createSession({
      date: '2026-09-11',
      startTime: '18:00',
    })
    const currentBlock = await service.addBlock(current.id, reverseHyper.id)
    await service.addRecord(currentBlock.id, { reps: 10, load: 5 })
    expect(
      (await service.previousPerformance(reverseHyper.id, current.id))?.session.id,
    ).toBe(prior.id)
    expect(
      (await service.getWorkout(prior.id))?.blocks[0].records[0].load,
    ).toBeUndefined()
  })

  it('finishes a cross-midnight workout without persisting duration', async () => {
    const session = await service.createSession({
      date: '2026-09-11',
      startTime: '23:20',
    })
    const finished = await service.finishSession(session.id, {
      date: session.date,
      startTime: '23:20',
      endTime: '00:35',
    })
    expect(calculateWorkoutDuration('23:20', '00:35')).toBe(75)
    expect(finished).not.toHaveProperty('duration')
  })
})
