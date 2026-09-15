import { createGymLogDatabase } from '../data/db/database-factory'
import {
  WorkoutRepository,
  type CreateWorkoutSessionInput,
  type ExerciseHistoryEntry,
  type WorkoutDetail,
} from '../data/repositories/workout-repository'
import { ExerciseRepository } from '../data/repositories/exercise-repository'
import type { GymLogDatabase } from '../data/db/gym-log-database'
import type { ExerciseRecordValues } from '../domain/exercise/types'
import type { WorkoutSession } from '../domain/workout/types'

export class WorkoutLoggingService {
  private readonly workouts: WorkoutRepository
  private readonly exercises: ExerciseRepository

  constructor(database: GymLogDatabase) {
    this.workouts = new WorkoutRepository(database)
    this.exercises = new ExerciseRepository(database)
  }

  createSession(input: CreateWorkoutSessionInput): Promise<WorkoutSession> {
    return this.workouts.createSession(input)
  }

  getWorkout(id: string): Promise<WorkoutDetail | undefined> {
    return this.workouts.getWorkoutById(id)
  }

  listAllSessions(): Promise<WorkoutSession[]> {
    return this.workouts.listAllSessions()
  }
  moveBlock(id: string, direction: -1 | 1): Promise<void> {
    return this.workouts.moveExerciseBlock(id, direction)
  }
  moveRecord(id: string, direction: -1 | 1): Promise<void> {
    return this.workouts.moveExerciseRecord(id, direction)
  }

  async listUnfinishedSessions(): Promise<WorkoutSession[]> {
    const sessions = await this.workouts.listSessionsByDateRange(
      '0000-01-01',
      '9999-12-31',
    )
    return sessions.filter((session) => session.endTime === undefined)
  }

  listAvailableExercises() {
    return this.exercises.list()
  }

  addBlock(sessionId: string, exerciseId: string) {
    return this.workouts.addExerciseBlock(sessionId, exerciseId)
  }

  removeBlock(id: string): Promise<void> {
    return this.workouts.removeExerciseBlock(id)
  }

  addRecord(blockId: string, values: ExerciseRecordValues) {
    return this.workouts.addExerciseRecord(blockId, values)
  }

  updateRecord(id: string, values: ExerciseRecordValues) {
    return this.workouts.updateExerciseRecord(id, values)
  }

  removeRecord(id: string): Promise<void> {
    return this.workouts.removeExerciseRecord(id)
  }

  finishSession(
    id: string,
    input: Pick<CreateWorkoutSessionInput, 'date' | 'startTime' | 'endTime'>,
  ) {
    return this.workouts.updateWorkoutTime(id, input)
  }

  cancelSession(id: string): Promise<void> {
    return this.workouts.deleteWorkoutSession(id)
  }

  async previousPerformance(
    exerciseId: string,
    sessionId: string,
  ): Promise<ExerciseHistoryEntry | undefined> {
    const current = await this.workouts.getSessionById(sessionId)
    if (current === undefined) return undefined
    const history = await this.workouts.listExerciseHistory(exerciseId)
    return history.find(
      (entry) => entry.session.id !== sessionId && entry.session.date <= current.date,
    )
  }
}

export const workoutLoggingService = new WorkoutLoggingService(createGymLogDatabase())
