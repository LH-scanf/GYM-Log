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
   * 一次性修正已有动作的 category。
   * - 正式动作库里的动作（精确名称匹配）无论当前分类是什么，都覆盖为最终值；
   * - 其余动作仅在 category 缺失时用 infer 兜底（已是正式分类的不动）。
   * 迁移完成后不再重复覆盖，之后用户在编辑页手动改的 category 永久保留。
   */
  async reconcileExerciseCategories(
    official: Readonly<Record<string, ExerciseCategory>>,
    infer: (name: string) => ExerciseCategory,
  ): Promise<number> {
    const exercises = await this.exercises.list({ includeArchived: true })
    let changed = 0

    for (const exercise of exercises) {
      const officialCategory = official[exercise.name]
      if (officialCategory !== undefined) {
        if (exercise.category !== officialCategory) {
          await this.exercises.setCategory(exercise.id, officialCategory)
          changed += 1
        }
        continue
      }

      // 不在正式库：只兜底 category 缺失的旧动作，不覆盖已有分类。
      if (exercise.category === undefined) {
        await this.exercises.setCategory(exercise.id, infer(exercise.name))
        changed += 1
      }
    }

    return changed
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
