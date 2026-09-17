import { createGymLogDatabase } from '../data/db/database-factory'
import {
  ExerciseFamilyRepository,
  type CreateExerciseFamilyInput,
} from '../data/repositories/exercise-family-repository'
import {
  ExerciseRepository,
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from '../data/repositories/exercise-repository'
import type { GymLogDatabase } from '../data/db/gym-log-database'
import type { Exercise, ExerciseCategory, ExerciseFamily } from '../domain/exercise/types'

export class ExerciseManagementService {
  private readonly exercises: ExerciseRepository
  private readonly families: ExerciseFamilyRepository

  constructor(database: GymLogDatabase) {
    this.exercises = new ExerciseRepository(database)
    this.families = new ExerciseFamilyRepository(database)
  }

  listExercises(includeArchived = false): Promise<Exercise[]> {
    return this.exercises.list({ includeArchived })
  }

  getExercise(id: string): Promise<Exercise | undefined> {
    return this.exercises.getById(id)
  }

  createExercise(input: CreateExerciseInput): Promise<Exercise> {
    return this.exercises.create(input)
  }

  updateExercise(id: string, input: UpdateExerciseInput): Promise<Exercise> {
    return this.exercises.update(id, input)
  }

  archiveExercise(id: string): Promise<Exercise> {
    return this.exercises.archive(id)
  }

  restoreExercise(id: string): Promise<Exercise> {
    return this.exercises.restore(id)
  }

  setFavoriteExercise(id: string, favorite: boolean): Promise<Exercise> {
    return this.exercises.setFavorite(id, favorite)
  }

  setCategoryExercise(id: string, category: ExerciseCategory): Promise<Exercise> {
    return this.exercises.setCategory(id, category)
  }

  /**
   * 一次性补全历史动作的 category（按名称关键词启发式归类）。
   * 幂等：只处理 category 缺失的动作，已有 category 的保持不变；
   * 匹配不上的归 OTHER。不动 schema version、不加索引。
   */
  async backfillExerciseCategories(
    infer: (name: string) => ExerciseCategory,
  ): Promise<number> {
    const exercises = await this.exercises.list({ includeArchived: true })
    const missing = exercises.filter((exercise) => exercise.category === undefined)
    await Promise.all(
      missing.map((exercise) =>
        this.exercises.setCategory(exercise.id, infer(exercise.name)),
      ),
    )
    return missing.length
  }

  canHardDeleteExercise(id: string): Promise<boolean> {
    return this.exercises.canHardDelete(id)
  }

  hardDeleteExercise(id: string): Promise<void> {
    return this.exercises.hardDelete(id)
  }

  listFamilies(): Promise<ExerciseFamily[]> {
    return this.families.list()
  }

  createFamily(input: CreateExerciseFamilyInput): Promise<ExerciseFamily> {
    return this.families.create(input)
  }

  renameFamily(id: string, name: string): Promise<ExerciseFamily> {
    return this.families.rename(id, name)
  }

  hardDeleteFamily(id: string): Promise<void> {
    return this.families.hardDelete(id)
  }
}

export const exerciseManagementService = new ExerciseManagementService(
  createGymLogDatabase(),
)
