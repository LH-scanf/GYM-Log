import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImportFormatError, UnsupportedBackupVersionError } from '../../domain/errors'
import type { GymLogDatabase } from '../db/gym-log-database'
import { createGymLogDatabase } from '../db/database-factory'
import { ExerciseFamilyRepository } from '../repositories/exercise-family-repository'
import { ExerciseRepository } from '../repositories/exercise-repository'
import { SettingsRepository } from '../repositories/settings-repository'
import { WorkoutRepository } from '../repositories/workout-repository'
import { BackupService } from './backup-service'

const externalSchema = {
  reps: 'REQUIRED',
  load: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
} as const

describe('GymLog Backup v1', () => {
  let database: GymLogDatabase
  let backupService: BackupService
  let exercises: ExerciseRepository
  let workouts: WorkoutRepository
  let families: ExerciseFamilyRepository
  let settings: SettingsRepository

  beforeEach(async () => {
    database = createGymLogDatabase(`GymLog-backup-test-${crypto.randomUUID()}`)
    await database.open()
    backupService = new BackupService(database)
    exercises = new ExerciseRepository(database)
    workouts = new WorkoutRepository(database)
    families = new ExerciseFamilyRepository(database)
    settings = new SettingsRepository(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('round-trips full raw data without derived statistics', async () => {
    await createRealTrainingData()
    const backup = await backupService.exportBackup('2026-09-15T00:30:00.000Z')

    await database.transaction(
      'rw',
      [
        database.exerciseFamilies,
        database.exercises,
        database.workoutSessions,
        database.exerciseBlocks,
        database.exerciseRecords,
        database.settings,
      ],
      async () => {
        await database.exerciseFamilies.clear()
        await database.exercises.clear()
        await database.workoutSessions.clear()
        await database.exerciseBlocks.clear()
        await database.exerciseRecords.clear()
        await database.settings.clear()
      },
    )

    await backupService.restore(backup)

    expect(await backupService.exportBackup('2026-09-15T00:30:00.000Z')).toEqual(backup)
  })

  it('rejects malformed foreign keys before changing the current database', async () => {
    await createRealTrainingData()
    const before = await backupService.exportBackup('2026-09-15T00:30:00.000Z')
    const invalid = structuredClone(before)
    invalid.data.exerciseBlocks[0].sessionId = 'missing-session'

    await expect(backupService.restore(invalid)).rejects.toBeInstanceOf(ImportFormatError)
    expect(await backupService.exportBackup('2026-09-15T00:30:00.000Z')).toEqual(before)
  })

  it('rejects unsupported backup versions without changing the current database', async () => {
    await createRealTrainingData()
    const before = await backupService.exportBackup('2026-09-15T00:30:00.000Z')
    const unsupported = { ...before, version: 2 }

    await expect(backupService.restore(unsupported)).rejects.toBeInstanceOf(
      UnsupportedBackupVersionError,
    )
    expect(await backupService.exportBackup('2026-09-15T00:30:00.000Z')).toEqual(before)
  })

  it('rejects invalid record values without changing the current database', async () => {
    await createRealTrainingData()
    const before = await backupService.exportBackup('2026-09-15T00:30:00.000Z')
    const invalid = structuredClone(before)
    invalid.data.exerciseRecords[0].reps = 8.5

    await expect(backupService.restore(invalid)).rejects.toBeInstanceOf(ImportFormatError)
    expect(await backupService.exportBackup('2026-09-15T00:30:00.000Z')).toEqual(before)
  })

  it('rolls back replace-all restore when a write fails inside the transaction', async () => {
    await createRealTrainingData()
    const before = await backupService.exportBackup('2026-09-15T00:30:00.000Z')
    const incoming = structuredClone(before)
    const bulkAdd = vi
      .spyOn(database.exercises, 'bulkAdd')
      .mockRejectedValueOnce(new Error('IndexedDB write failed'))

    await expect(backupService.restore(incoming)).rejects.toThrow(
      'IndexedDB write failed',
    )
    bulkAdd.mockRestore()

    expect(await backupService.exportBackup('2026-09-15T00:30:00.000Z')).toEqual(before)
  })

  async function createRealTrainingData(): Promise<void> {
    const reverseHyperFamily = await families.create({ name: '反向山羊' })
    const benchPress = await exercises.create({
      name: '卧推',
      recordSchema: externalSchema,
      loadMode: 'EXTERNAL',
    })
    const reverseHyper = await exercises.create({
      name: '反向山羊挺身',
      familyId: reverseHyperFamily.id,
      recordSchema: { ...externalSchema, load: 'OPTIONAL' },
      loadMode: 'BODYWEIGHT_PLUS',
    })
    const assistedPullUp = await exercises.create({
      name: '辅助引体',
      recordSchema: externalSchema,
      loadMode: 'ASSISTANCE',
    })
    const inclineWalk = await exercises.create({
      name: '爬坡',
      recordSchema: {
        reps: 'DISABLED',
        load: 'DISABLED',
        duration: 'REQUIRED',
        distance: 'DISABLED',
        speed: 'OPTIONAL',
        incline: 'OPTIONAL',
        side: 'DISABLED',
      },
      loadMode: 'NONE',
    })
    const session = await workouts.createSession({
      date: '2026-09-14',
      startTime: '23:20',
      endTime: '00:35',
    })
    const benchBlock = await workouts.addExerciseBlock(session.id, benchPress.id)
    const reverseHyperBlock = await workouts.addExerciseBlock(session.id, reverseHyper.id)
    const assistedPullUpBlock = await workouts.addExerciseBlock(
      session.id,
      assistedPullUp.id,
    )
    const inclineWalkBlock = await workouts.addExerciseBlock(session.id, inclineWalk.id)

    await workouts.addExerciseRecord(benchBlock.id, { load: 30, reps: 12 })
    await workouts.addExerciseRecord(benchBlock.id, { load: 35, reps: 12 })
    await workouts.addExerciseRecord(benchBlock.id, { load: 40, reps: 8 })
    await workouts.addExerciseRecord(benchBlock.id, { load: 45, reps: 4 })
    await workouts.addExerciseRecord(benchBlock.id, { load: 40, reps: 6 })
    await workouts.addExerciseRecord(reverseHyperBlock.id, { reps: 20 })
    await workouts.addExerciseRecord(reverseHyperBlock.id, { reps: 20 })
    await workouts.addExerciseRecord(reverseHyperBlock.id, { load: 5, reps: 10 })
    await workouts.addExerciseRecord(assistedPullUpBlock.id, { load: 50, reps: 10 })
    await workouts.addExerciseRecord(assistedPullUpBlock.id, { load: 50, reps: 8 })
    await workouts.addExerciseRecord(assistedPullUpBlock.id, { load: 45, reps: 7 })
    await workouts.addExerciseRecord(inclineWalkBlock.id, {
      duration: 40,
      speed: 5,
      incline: 12,
    })
    await settings.saveLastBackupAt('2026-09-15T00:30:00.000Z')
  }
})
