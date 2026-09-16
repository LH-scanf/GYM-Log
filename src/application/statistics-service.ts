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

  /**
   * 统计页「趋势」卡的默认动作：训练场次最多的那个动作。
   * 同场次时按 id 排序，保证结果稳定（否则 Map 插入顺序会随数据变更漂移）。
   */
  async mostTrainedExerciseId(): Promise<string | undefined> {
    const counts = new Map<string, number>()
    for (const block of await this.workouts.listAllBlocks()) {
      counts.set(block.exerciseId, (counts.get(block.exerciseId) ?? 0) + 1)
    }
    return [...counts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0]
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
