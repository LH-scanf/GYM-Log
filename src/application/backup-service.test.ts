import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGymLogDatabase } from '../data/db/database-factory'
import { ExerciseRepository } from '../data/repositories/exercise-repository'
import { GymLogDatabase } from '../data/db/gym-log-database'
import { BackupApplicationService } from './backup-service'

const schema = {
  reps: 'REQUIRED',
  load: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
} as const

describe('BackupApplicationService', () => {
  let database: GymLogDatabase
  let service: BackupApplicationService
  let exercises: ExerciseRepository
  beforeEach(async () => {
    database = createGymLogDatabase(`backup-application-${crypto.randomUUID()}`)
    await database.open()
    service = new BackupApplicationService(database)
    exercises = new ExerciseRepository(database)
  })
  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('exports canonical data, previews a valid import, and replaces all data only on restore', async () => {
    const bench = await exercises.create({
      name: '卧推',
      recordSchema: schema,
      loadMode: 'EXTERNAL',
    })
    const backup = await service.createExport('2026-09-15T00:30:00.000Z')
    const prepared = service.prepareImport(JSON.stringify(backup))
    expect(prepared.summary).toMatchObject({
      exportedAt: backup.exportedAt,
      exercises: 1,
    })
    await exercises.create({ name: '深蹲', recordSchema: schema, loadMode: 'EXTERNAL' })
    expect((await service.createExport()).data.exercises).toHaveLength(2)
    await service.restore(prepared.backup)
    expect(
      (await service.createExport()).data.exercises.map((exercise) => exercise.id),
    ).toEqual([bench.id])
  })

  it('rejects invalid JSON before any write and only records lastBackupAt after export succeeds', async () => {
    await exercises.create({ name: '卧推', recordSchema: schema, loadMode: 'EXTERNAL' })
    const before = await service.createExport('2026-09-15T00:30:00.000Z')
    expect(() => service.prepareImport('{invalid')).toThrow('无法解析 JSON')
    expect(await service.createExport('2026-09-15T00:30:00.000Z')).toEqual(before)
    expect(await service.getSettings()).toBeUndefined()
    await service.markExported('2026-09-16T00:30:00.000Z')
    expect((await service.getSettings())?.lastBackupAt).toBe('2026-09-16T00:30:00.000Z')
  })
})
