import type { GymLogDatabase } from '../db/gym-log-database'
import { BACKUP_FORMAT, BACKUP_VERSION, type GymLogBackupV1 } from './types'
import { validateBackup } from './backup-validation'

export class BackupService {
  constructor(private readonly database: GymLogDatabase) {}

  async exportBackup(exportedAt = new Date().toISOString()): Promise<GymLogBackupV1> {
    const [
      exerciseFamilies,
      exercises,
      workoutSessions,
      exerciseBlocks,
      exerciseRecords,
      settings,
    ] = await Promise.all([
      this.database.exerciseFamilies.toArray(),
      this.database.exercises.toArray(),
      this.database.workoutSessions.toArray(),
      this.database.exerciseBlocks.toArray(),
      this.database.exerciseRecords.toArray(),
      this.database.settings.toArray(),
    ])

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      data: {
        exerciseFamilies,
        exercises,
        workoutSessions,
        exerciseBlocks,
        exerciseRecords,
        settings,
      },
    }
  }

  async restore(value: unknown): Promise<void> {
    const backup = validateBackup(value)

    await this.database.transaction(
      'rw',
      [
        this.database.exerciseFamilies,
        this.database.exercises,
        this.database.workoutSessions,
        this.database.exerciseBlocks,
        this.database.exerciseRecords,
        this.database.settings,
      ],
      async () => {
        await Promise.all([
          this.database.exerciseFamilies.clear(),
          this.database.exercises.clear(),
          this.database.workoutSessions.clear(),
          this.database.exerciseBlocks.clear(),
          this.database.exerciseRecords.clear(),
          this.database.settings.clear(),
        ])

        await this.database.exerciseFamilies.bulkAdd(backup.data.exerciseFamilies)
        await this.database.exercises.bulkAdd(backup.data.exercises)
        await this.database.workoutSessions.bulkAdd(backup.data.workoutSessions)
        await this.database.exerciseBlocks.bulkAdd(backup.data.exerciseBlocks)
        await this.database.exerciseRecords.bulkAdd(backup.data.exerciseRecords)
        await this.database.settings.bulkAdd(backup.data.settings)
      },
    )
  }
}
