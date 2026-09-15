import { GymLogDatabase } from './gym-log-database'

export function createGymLogDatabase(name?: string): GymLogDatabase {
  return new GymLogDatabase(name)
}
