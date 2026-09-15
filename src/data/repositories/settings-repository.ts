import type { AppSettings } from '../../domain/workout/types'
import type { GymLogDatabase } from '../db/gym-log-database'
import { nowIso } from './repository-helpers'

export class SettingsRepository {
  constructor(private readonly database: GymLogDatabase) {}

  async get(): Promise<AppSettings | undefined> {
    return this.database.settings.get('app')
  }

  async saveLastBackupAt(lastBackupAt: string): Promise<AppSettings> {
    const current = await this.get()
    const timestamp = nowIso()
    const settings: AppSettings = {
      id: 'app',
      lastBackupAt,
      createdAt: current?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    await this.database.settings.put(settings)
    return settings
  }
}
