import type {
  Exercise,
  ExerciseFamily,
  ExerciseRecord,
  ISODateTime,
} from '../../domain/exercise/types'
import type {
  AppSettings,
  ExerciseBlock,
  WorkoutSession,
} from '../../domain/workout/types'

export const BACKUP_FORMAT = 'gymlog-backup' as const
export const BACKUP_VERSION = 1 as const

export interface GymLogBackupV1 {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: ISODateTime
  data: {
    exerciseFamilies: ExerciseFamily[]
    exercises: Exercise[]
    workoutSessions: WorkoutSession[]
    exerciseBlocks: ExerciseBlock[]
    exerciseRecords: ExerciseRecord[]
    settings: AppSettings[]
  }
}
