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
import type { Exercise, ExerciseFamily } from '../domain/exercise/types'

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
