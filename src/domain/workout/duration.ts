import { ValidationError } from '../errors'
import type { LocalDate, LocalTime } from '../exercise/types'

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/
const localTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export function assertValidLocalDate(date: LocalDate): void {
  if (!localDatePattern.test(date)) {
    throw new ValidationError('date must use the YYYY-MM-DD local-date format.')
  }

  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new ValidationError('date must be a real calendar date.')
  }
}

export function assertValidLocalTime(time: LocalTime | undefined, field: string): void {
  if (time !== undefined && !localTimePattern.test(time)) {
    throw new ValidationError(`${field} must use the HH:mm local-time format.`)
  }
}

export function calculateWorkoutDuration(
  startTime: LocalTime | undefined,
  endTime: LocalTime | undefined,
): number | undefined {
  if (startTime === undefined || endTime === undefined) {
    return undefined
  }

  assertValidLocalTime(startTime, 'startTime')
  assertValidLocalTime(endTime, 'endTime')

  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  return end >= start ? end - start : 24 * 60 - start + end
}

function toMinutes(time: LocalTime): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
