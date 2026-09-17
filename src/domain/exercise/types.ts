export type UUID = string
export type ISODateTime = string
export type LocalDate = string
export type LocalTime = string

export type FieldRequirement = 'DISABLED' | 'OPTIONAL' | 'REQUIRED'

export type LoadMode = 'NONE' | 'EXTERNAL' | 'BODYWEIGHT_PLUS' | 'ASSISTANCE'

export type Side = 'LEFT' | 'RIGHT' | 'BOTH'

export interface RecordSchema {
  reps: FieldRequirement
  load: FieldRequirement
  duration: FieldRequirement
  distance: FieldRequirement
  speed: FieldRequirement
  incline: FieldRequirement
  side: FieldRequirement
}

export interface ExerciseFamily {
  id: UUID
  name: string
  description?: string
  archived: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Exercise {
  id: UUID
  name: string
  familyId?: UUID
  recordSchema: RecordSchema
  loadMode: LoadMode
  archived: boolean
  favorite?: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ExerciseRecordValues {
  reps?: number
  load?: number
  duration?: number
  distance?: number
  speed?: number
  incline?: number
  side?: Side
  note?: string
}

export interface ExerciseRecord extends ExerciseRecordValues {
  id: UUID
  exerciseBlockId: UUID
  order: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
