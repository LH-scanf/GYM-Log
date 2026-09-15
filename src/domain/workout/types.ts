import type { ISODateTime, LocalDate, LocalTime, UUID } from '../exercise/types'

export interface WorkoutSession {
  id: UUID
  date: LocalDate
  startTime?: LocalTime
  endTime?: LocalTime
  note?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ExerciseBlock {
  id: UUID
  sessionId: UUID
  exerciseId: UUID
  order: number
  note?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface AppSettings {
  id: 'app'
  lastBackupAt?: ISODateTime
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
