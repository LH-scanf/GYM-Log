import Dexie, { type Table } from 'dexie'
import type {
  Exercise,
  ExerciseFamily,
  ExerciseRecord,
} from '../../domain/exercise/types'
import type {
  AppSettings,
  ExerciseBlock,
  WorkoutSession,
} from '../../domain/workout/types'

export const DATABASE_VERSION = 1
export const DEFAULT_DATABASE_NAME = 'GymLog'

export class GymLogDatabase extends Dexie {
  exerciseFamilies!: Table<ExerciseFamily, string>
  exercises!: Table<Exercise, string>
  workoutSessions!: Table<WorkoutSession, string>
  exerciseBlocks!: Table<ExerciseBlock, string>
  exerciseRecords!: Table<ExerciseRecord, string>
  settings!: Table<AppSettings, string>

  constructor(name = DEFAULT_DATABASE_NAME) {
    super(name)

    this.version(DATABASE_VERSION).stores({
      exerciseFamilies: 'id,name,archived',
      exercises: 'id,name,familyId,archived',
      workoutSessions: 'id,date,createdAt',
      exerciseBlocks: 'id,sessionId,exerciseId,[sessionId+order],[exerciseId+sessionId]',
      exerciseRecords: 'id,exerciseBlockId,[exerciseBlockId+order]',
      settings: 'id',
    })
  }
}
