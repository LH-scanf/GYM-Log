import { createGymLogDatabase } from '../data/db/database-factory'
import { ExerciseRepository } from '../data/repositories/exercise-repository'
import { WorkoutRepository } from '../data/repositories/workout-repository'
import type { GymLogDatabase } from '../data/db/gym-log-database'
import {
  calculateExerciseStatistics,
  calculateOverview,
  createHeatmap,
  type ExerciseStatistics,
  type HeatmapDay,
  type OverviewStatistics,
} from '../domain/statistics/statistics'
import type { WorkoutSession } from '../domain/workout/types'

export class StatisticsService {
  private readonly exercises: ExerciseRepository
  private readonly workouts: WorkoutRepository

  constructor(database: GymLogDatabase) {
    this.exercises = new ExerciseRepository(database)
    this.workouts = new WorkoutRepository(database)
  }

  async overview(referenceDate: string): Promise<OverviewStatistics> {
    return calculateOverview(await this.workouts.listAllSessions(), referenceDate)
  }

  async heatmap(year: number): Promise<HeatmapDay[]> {
    return createHeatmap(year, await this.workouts.listAllSessions())
  }

  async availableYears(): Promise<number[]> {
    const years = new Set(
      (await this.workouts.listAllSessions()).map((session) =>
        Number(session.date.slice(0, 4)),
      ),
    )
    return [...years].sort((left, right) => right - left)
  }

  async sessionsOn(date: string): Promise<WorkoutSession[]> {
    return this.workouts.listSessionsByDateRange(date, date)
  }

  listExercises() {
    return this.exercises.list({ includeArchived: true })
  }

  async exerciseStatistics(exerciseId: string): Promise<ExerciseStatistics | undefined> {
    const exercise = await this.exercises.getById(exerciseId)
    if (exercise === undefined) return undefined
    return calculateExerciseStatistics(
      exercise,
      await this.workouts.listExerciseHistory(exerciseId),
    )
  }

  getExercise(exerciseId: string) {
    return this.exercises.getById(exerciseId)
  }
}

export const statisticsService = new StatisticsService(createGymLogDatabase())
