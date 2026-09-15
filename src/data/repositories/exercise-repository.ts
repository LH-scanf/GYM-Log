import { DataIntegrityError } from '../../domain/errors'
import { assertValidRecordSchema } from '../../domain/exercise/validation'
import type { Exercise, LoadMode, RecordSchema } from '../../domain/exercise/types'
import type { GymLogDatabase } from '../db/gym-log-database'
import { assertFound, assertNonEmptyName, createId, nowIso } from './repository-helpers'

export interface CreateExerciseInput {
  name: string
  familyId?: string
  recordSchema: RecordSchema
  loadMode: LoadMode
}

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

  async archive(id: string): Promise<Exercise> {
    return this.setArchived(id, true)
  }

  async restore(id: string): Promise<Exercise> {
    return this.setArchived(id, false)
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
