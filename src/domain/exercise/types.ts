export type UUID = string
export type ISODateTime = string
export type LocalDate = string
export type LocalTime = string

export type FieldRequirement = 'DISABLED' | 'OPTIONAL' | 'REQUIRED'

export type LoadMode = 'NONE' | 'EXTERNAL' | 'BODYWEIGHT_PLUS' | 'ASSISTANCE'

export type Side = 'LEFT' | 'RIGHT' | 'BOTH'

/**
 * 动作的身体部位 / 分类，独立于 ExerciseFamily（Family 表达动作变式关系）。
 * 用于「添加动作」Sheet 的部位筛选；历史数据无 category 时保持兼容（可选字段）。
 */
export type ExerciseCategory =
  'CHEST' | 'BACK' | 'SHOULDERS' | 'ARMS' | 'LEGS' | 'CORE' | 'CARDIO' | 'OTHER'

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
  category?: ExerciseCategory
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
