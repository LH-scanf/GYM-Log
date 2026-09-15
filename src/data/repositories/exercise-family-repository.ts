import { DataIntegrityError } from '../../domain/errors'
import type { ExerciseFamily } from '../../domain/exercise/types'
import type { GymLogDatabase } from '../db/gym-log-database'
import { assertFound, assertNonEmptyName, createId, nowIso } from './repository-helpers'

export type CreateExerciseFamilyInput = Pick<ExerciseFamily, 'name' | 'description'>

export class ExerciseFamilyRepository {
  constructor(private readonly database: GymLogDatabase) {}

  async create(input: CreateExerciseFamilyInput): Promise<ExerciseFamily> {
    const timestamp = nowIso()
    const family: ExerciseFamily = {
      id: createId(),
      name: assertNonEmptyName(input.name, 'Exercise family'),
      ...(input.description === undefined ? {} : { description: input.description }),
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await this.database.exerciseFamilies.add(family)
    return family
  }

  async getById(id: string): Promise<ExerciseFamily | undefined> {
    return this.database.exerciseFamilies.get(id)
  }

  async list(): Promise<ExerciseFamily[]> {
    return this.database.exerciseFamilies.orderBy('name').toArray()
  }

  async rename(id: string, name: string): Promise<ExerciseFamily> {
    const family = assertFound(await this.getById(id), 'Exercise family', id)
    const updated = {
      ...family,
      name: assertNonEmptyName(name, 'Exercise family'),
      updatedAt: nowIso(),
    }

    await this.database.exerciseFamilies.put(updated)
    return updated
  }

  async archive(id: string): Promise<ExerciseFamily> {
    return this.setArchived(id, true)
  }

  async restore(id: string): Promise<ExerciseFamily> {
    return this.setArchived(id, false)
  }

  async hardDelete(id: string): Promise<void> {
    const dependentExercise = await this.database.exercises
      .where('familyId')
      .equals(id)
      .first()

    if (dependentExercise !== undefined) {
      throw new DataIntegrityError(
        'An exercise family with exercises cannot be hard deleted.',
      )
    }

    await this.database.exerciseFamilies.delete(id)
  }

  private async setArchived(id: string, archived: boolean): Promise<ExerciseFamily> {
    const family = assertFound(await this.getById(id), 'Exercise family', id)
    const updated = { ...family, archived, updatedAt: nowIso() }

    await this.database.exerciseFamilies.put(updated)
    return updated
  }
}
