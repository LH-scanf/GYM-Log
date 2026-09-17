import { DataIntegrityError } from '../../domain/errors'
import { inferCategory } from '../../domain/exercise/category'
import { assertValidRecordSchema } from '../../domain/exercise/validation'
import type {
  Exercise,
  ExerciseCategory,
  LoadMode,
  RecordSchema,
} from '../../domain/exercise/types'
import type { GymLogDatabase } from '../db/gym-log-database'
import { assertFound, assertNonEmptyName, createId, nowIso } from './repository-helpers'

export interface CreateExerciseInput {
  name: string
  familyId?: string
  category?: ExerciseCategory
  recordSchema: RecordSchema
  loadMode: LoadMode
}

export type UpdateExerciseInput = CreateExerciseInput

export class ExerciseRepository {
  constructor(private readonly database: GymLogDatabase) {}

  async create(input: CreateExerciseInput): Promise<Exercise> {
    assertValidRecordSchema(input.recordSchema, input.loadMode)

    if (input.familyId !== undefined) {
      assertFound(
        await this.database.exerciseFamilies.get(input.familyId),
        'Exercise family',
        input.familyId,
      )
    }

    const timestamp = nowIso()
    const exercise: Exercise = {
      id: createId(),
      name: assertNonEmptyName(input.name, 'Exercise'),
      ...(input.familyId === undefined ? {} : { familyId: input.familyId }),
      // 未显式指定 category 时按名称自动归类，保证新动作在部位筛选里可见。
      category: input.category ?? inferCategory(input.name),
      recordSchema: input.recordSchema,
      loadMode: input.loadMode,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await this.database.exercises.add(exercise)
    return exercise
  }

  async getById(id: string): Promise<Exercise | undefined> {
    return this.database.exercises.get(id)
  }

  async list(options: { includeArchived?: boolean } = {}): Promise<Exercise[]> {
    const exercises = await this.database.exercises.orderBy('name').toArray()
    return options.includeArchived
      ? exercises
      : exercises.filter((exercise) => !exercise.archived)
  }

  async rename(id: string, name: string): Promise<Exercise> {
    const exercise = assertFound(await this.getById(id), 'Exercise', id)
    const updated = {
      ...exercise,
      name: assertNonEmptyName(name, 'Exercise'),
      updatedAt: nowIso(),
    }

    await this.database.exercises.put(updated)
    return updated
  }

  async update(id: string, input: UpdateExerciseInput): Promise<Exercise> {
    const exercise = assertFound(await this.getById(id), 'Exercise', id)
    assertValidRecordSchema(input.recordSchema, input.loadMode)

    if (input.familyId !== undefined) {
      assertFound(
        await this.database.exerciseFamilies.get(input.familyId),
        'Exercise family',
        input.familyId,
      )
    }

    const updated: Exercise = {
      ...exercise,
      name: assertNonEmptyName(input.name, 'Exercise'),
      ...(input.familyId === undefined
        ? { familyId: undefined }
        : { familyId: input.familyId }),
      // 显式指定则用指定值；否则保留原分类（改名不重置分类）。
      ...(input.category === undefined ? {} : { category: input.category }),
      recordSchema: input.recordSchema,
      loadMode: input.loadMode,
      updatedAt: nowIso(),
    }

    await this.database.exercises.put(updated)
    return updated
  }

  async archive(id: string): Promise<Exercise> {
    return this.setArchived(id, true)
  }

  async restore(id: string): Promise<Exercise> {
    return this.setArchived(id, false)
  }

  async setFavorite(id: string, favorite: boolean): Promise<Exercise> {
    const exercise = assertFound(await this.getById(id), 'Exercise', id)
    const updated = { ...exercise, favorite, updatedAt: nowIso() }

    await this.database.exercises.put(updated)
    return updated
  }

  async setCategory(id: string, category: ExerciseCategory): Promise<Exercise> {
    const exercise = assertFound(await this.getById(id), 'Exercise', id)
    const updated = { ...exercise, category, updatedAt: nowIso() }

    await this.database.exercises.put(updated)
    return updated
  }

  async canHardDelete(id: string): Promise<boolean> {
    const block = await this.database.exerciseBlocks
      .where('exerciseId')
      .equals(id)
      .first()
    return block === undefined
  }

  async delete(id: string): Promise<'hard-deleted' | 'archived'> {
    if (await this.canHardDelete(id)) {
      await this.database.exercises.delete(id)
      return 'hard-deleted'
    }

    await this.archive(id)
    return 'archived'
  }

  async hardDelete(id: string): Promise<void> {
    if (!(await this.canHardDelete(id))) {
      throw new DataIntegrityError(
        'An exercise with workout history cannot be hard deleted.',
      )
    }

    await this.database.exercises.delete(id)
  }

  private async setArchived(id: string, archived: boolean): Promise<Exercise> {
    const exercise = assertFound(await this.getById(id), 'Exercise', id)
    const updated = { ...exercise, archived, updatedAt: nowIso() }

    await this.database.exercises.put(updated)
    return updated
  }
}
