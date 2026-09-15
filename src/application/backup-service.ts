import { createGymLogDatabase } from '../data/db/database-factory'
import { BackupService } from '../data/backup/backup-service'
import { validateBackup } from '../data/backup/backup-validation'
import type { GymLogBackupV1 } from '../data/backup/types'
import type { GymLogDatabase } from '../data/db/gym-log-database'
import { SettingsRepository } from '../data/repositories/settings-repository'

export interface BackupSummary {
  exportedAt: string
  exerciseFamilies: number
  exercises: number
  workoutSessions: number
  exerciseBlocks: number
  exerciseRecords: number
}

export class BackupApplicationService {
  private readonly backup: BackupService
  private readonly settings: SettingsRepository

  constructor(database: GymLogDatabase) {
    this.backup = new BackupService(database)
    this.settings = new SettingsRepository(database)
  }

  async createExport(exportedAt = new Date().toISOString()): Promise<GymLogBackupV1> {
    return this.backup.exportBackup(exportedAt)
  }

  async markExported(exportedAt: string): Promise<void> {
    await this.settings.saveLastBackupAt(exportedAt)
  }

  getSettings() {
    return this.settings.get()
  }

  prepareImport(json: string): { backup: GymLogBackupV1; summary: BackupSummary } {
    let parsed: unknown
    try {
      parsed = JSON.parse(json) as unknown
    } catch {
      throw new Error('无法解析 JSON 备份文件。')
    }
    const backup = validateBackup(parsed)
    return { backup, summary: summarizeBackup(backup) }
  }

  async restore(backup: GymLogBackupV1): Promise<void> {
    await this.backup.restore(backup)
  }
}

export function summarizeBackup(backup: GymLogBackupV1): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    exerciseFamilies: backup.data.exerciseFamilies.length,
    exercises: backup.data.exercises.length,
    workoutSessions: backup.data.workoutSessions.length,
    exerciseBlocks: backup.data.exerciseBlocks.length,
    exerciseRecords: backup.data.exerciseRecords.length,
  }
}

export const backupApplicationService = new BackupApplicationService(
  createGymLogDatabase(),
)
