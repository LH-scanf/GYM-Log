import { ValidationError } from '../errors'
import type { WorkoutSession } from './types'
import { assertValidLocalDate, assertValidLocalTime } from './duration'

export function assertValidWorkoutSession(
  session: Pick<WorkoutSession, 'date' | 'startTime' | 'endTime'>,
): void {
  assertValidLocalDate(session.date)
  assertValidLocalTime(session.startTime, 'startTime')
  assertValidLocalTime(session.endTime, 'endTime')
}

export function assertValidOrder(order: number, entityName: string): void {
  if (!Number.isInteger(order) || order < 0) {
    throw new ValidationError(`${entityName} order must be a non-negative integer.`)
  }
}
