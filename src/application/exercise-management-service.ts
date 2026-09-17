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
   * 兜底修正已有动作的 category。
   * 已有 category 一律尊重，不做覆盖：无论动作是否命中正式库，只要 category
   * 已有值就保持原样；只有 category 缺失的旧数据才兜底。
   * - 命中正式库（精确名称匹配）→ 用正式分类兜底；
   * - 未命中 → 用 infer 启发式兜底。
   * 因此每次进入动作页重复调用是幂等的、无副作用的，用户手动改过的分类
   * 以及备份恢复回来的分类都不会被覆盖。
   */
  async reconcileExerciseCategories(
    official: Readonly<Record<string, ExerciseCategory>>,
    infer: (name: string) => ExerciseCategory,
  ): Promise<number> {
    const exercises = await this.exercises.list({ includeArchived: true })
    let changed = 0

    for (const exercise of exercises) {
      // 已有 category 一律尊重，不覆盖。
      if (exercise.category !== undefined) {
        continue
      }

      const officialCategory = official[exercise.name]
      await this.exercises.setCategory(
        exercise.id,
        officialCategory !== undefined ? officialCategory : infer(exercise.name),
      )
      changed += 1
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
