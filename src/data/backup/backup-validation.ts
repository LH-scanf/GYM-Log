import { ImportFormatError, UnsupportedBackupVersionError } from '../../domain/errors'
import {
  assertValidRecordSchema,
  validateExerciseRecord,
} from '../../domain/exercise/validation'
import type {
  Exercise,
  ExerciseFamily,
  ExerciseRecord,
  ExerciseRecordValues,
  FieldRequirement,
  ISODateTime,
  LoadMode,
  RecordSchema,
  Side,
} from '../../domain/exercise/types'
import {
  assertValidOrder,
  assertValidWorkoutSession,
} from '../../domain/workout/validation'
import type {
  AppSettings,
  ExerciseBlock,
  WorkoutSession,
} from '../../domain/workout/types'
import { BACKUP_FORMAT, BACKUP_VERSION, type GymLogBackupV1 } from './types'

const fieldRequirements: ReadonlySet<FieldRequirement> = new Set([
  'DISABLED',
  'OPTIONAL',
  'REQUIRED',
])
const loadModes: ReadonlySet<LoadMode> = new Set([
  'NONE',
  'EXTERNAL',
  'BODYWEIGHT_PLUS',
  'ASSISTANCE',
])
const sides: ReadonlySet<Side> = new Set(['LEFT', 'RIGHT', 'BOTH'])

export function validateBackup(value: unknown): GymLogBackupV1 {
  const root = asObject(value, 'Backup must be an object.')

  if (root.format !== BACKUP_FORMAT) {
    throw new ImportFormatError('Backup format is not gymlog-backup.')
  }

  if (root.version !== BACKUP_VERSION) {
    throw new UnsupportedBackupVersionError('Backup version is not supported.')
  }

  const data = asObject(root.data, 'Backup data is missing.')
  const backup: GymLogBackupV1 = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: parseIsoDateTime(root.exportedAt, 'exportedAt'),
    data: {
      exerciseFamilies: asArray(data.exerciseFamilies, 'exerciseFamilies').map(
        parseExerciseFamily,
      ),
      exercises: asArray(data.exercises, 'exercises').map(parseExercise),
      workoutSessions: asArray(data.workoutSessions, 'workoutSessions').map(
        parseWorkoutSession,
      ),
      exerciseBlocks: asArray(data.exerciseBlocks, 'exerciseBlocks').map(
        parseExerciseBlock,
      ),
      exerciseRecords: asArray(data.exerciseRecords, 'exerciseRecords').map(
        parseExerciseRecord,
      ),
      settings: asArray(data.settings, 'settings').map(parseSettings),
    },
  }

  validateReferencesAndRules(backup)
  return backup
}

function validateReferencesAndRules(backup: GymLogBackupV1): void {
  const allIds = new Set<string>()
  const register = (id: string, entityName: string): void => {
    if (allIds.has(id)) {
      throw new ImportFormatError(`Duplicate ID found for ${entityName}: ${id}.`)
    }
    allIds.add(id)
  }

  backup.data.exerciseFamilies.forEach((family) => register(family.id, 'exercise family'))
  backup.data.exercises.forEach((exercise) => register(exercise.id, 'exercise'))
  backup.data.workoutSessions.forEach((session) =>
    register(session.id, 'workout session'),
  )
  backup.data.exerciseBlocks.forEach((block) => register(block.id, 'exercise block'))
  backup.data.exerciseRecords.forEach((record) => register(record.id, 'exercise record'))
  backup.data.settings.forEach((settings) => register(settings.id, 'settings'))

  const familyIds = new Set(backup.data.exerciseFamilies.map((family) => family.id))
  const exercisesById = new Map(
    backup.data.exercises.map((exercise) => [exercise.id, exercise]),
  )
  const sessionIds = new Set(backup.data.workoutSessions.map((session) => session.id))
  const blocksById = new Map(backup.data.exerciseBlocks.map((block) => [block.id, block]))

  for (const exercise of backup.data.exercises) {
    if (exercise.familyId !== undefined && !familyIds.has(exercise.familyId)) {
      throw new ImportFormatError(`Exercise ${exercise.id} references a missing family.`)
    }

    try {
      assertValidRecordSchema(exercise.recordSchema, exercise.loadMode)
    } catch (error) {
      throw new ImportFormatError(errorMessage(error))
    }
  }

  for (const block of backup.data.exerciseBlocks) {
    if (!sessionIds.has(block.sessionId) || !exercisesById.has(block.exerciseId)) {
      throw new ImportFormatError(
        `Exercise block ${block.id} has an invalid foreign key.`,
      )
    }
  }

  for (const record of backup.data.exerciseRecords) {
    const block = blocksById.get(record.exerciseBlockId)

    if (block === undefined) {
      throw new ImportFormatError(
        `Exercise record ${record.id} references a missing block.`,
      )
    }

    const exercise = exercisesById.get(block.exerciseId)

    if (exercise === undefined) {
      throw new ImportFormatError(
        `Exercise record ${record.id} has no resolvable exercise.`,
      )
    }

    try {
      validateExerciseRecord(exercise, record, { allowHistoricalFields: true })
    } catch (error) {
      throw new ImportFormatError(errorMessage(error))
    }
  }
}

function parseExerciseFamily(value: unknown): ExerciseFamily {
  const input = asObject(value, 'Exercise family must be an object.')
  return {
    id: parseId(input.id, 'Exercise family id'),
    name: parseName(input.name, 'Exercise family name'),
    ...(input.description === undefined
      ? {}
      : { description: parseString(input.description, 'description') }),
    archived: parseBoolean(input.archived, 'Exercise family archived'),
    createdAt: parseIsoDateTime(input.createdAt, 'Exercise family createdAt'),
    updatedAt: parseIsoDateTime(input.updatedAt, 'Exercise family updatedAt'),
  }
}

function parseExercise(value: unknown): Exercise {
  const input = asObject(value, 'Exercise must be an object.')
  return {
    id: parseId(input.id, 'Exercise id'),
    name: parseName(input.name, 'Exercise name'),
    ...(input.familyId === undefined
      ? {}
      : { familyId: parseId(input.familyId, 'Exercise familyId') }),
    recordSchema: parseRecordSchema(input.recordSchema),
    loadMode: parseLoadMode(input.loadMode),
    archived: parseBoolean(input.archived, 'Exercise archived'),
    createdAt: parseIsoDateTime(input.createdAt, 'Exercise createdAt'),
    updatedAt: parseIsoDateTime(input.updatedAt, 'Exercise updatedAt'),
  }
}

function parseWorkoutSession(value: unknown): WorkoutSession {
  const input = asObject(value, 'Workout session must be an object.')
  const session: WorkoutSession = {
    id: parseId(input.id, 'Workout session id'),
    date: parseString(input.date, 'Workout session date'),
    ...(input.startTime === undefined
      ? {}
      : { startTime: parseString(input.startTime, 'startTime') }),
    ...(input.endTime === undefined
      ? {}
      : { endTime: parseString(input.endTime, 'endTime') }),
    ...(input.note === undefined ? {} : { note: parseString(input.note, 'note') }),
    createdAt: parseIsoDateTime(input.createdAt, 'Workout session createdAt'),
    updatedAt: parseIsoDateTime(input.updatedAt, 'Workout session updatedAt'),
  }

  try {
    assertValidWorkoutSession(session)
  } catch (error) {
    throw new ImportFormatError(errorMessage(error))
  }

  return session
}

function parseExerciseBlock(value: unknown): ExerciseBlock {
  const input = asObject(value, 'Exercise block must be an object.')
  const block: ExerciseBlock = {
    id: parseId(input.id, 'Exercise block id'),
    sessionId: parseId(input.sessionId, 'Exercise block sessionId'),
    exerciseId: parseId(input.exerciseId, 'Exercise block exerciseId'),
    order: parseNumber(input.order, 'Exercise block order'),
    ...(input.note === undefined ? {} : { note: parseString(input.note, 'note') }),
    createdAt: parseIsoDateTime(input.createdAt, 'Exercise block createdAt'),
    updatedAt: parseIsoDateTime(input.updatedAt, 'Exercise block updatedAt'),
  }

  try {
    assertValidOrder(block.order, 'Exercise block')
  } catch (error) {
    throw new ImportFormatError(errorMessage(error))
  }

  return block
}

function parseExerciseRecord(value: unknown): ExerciseRecord {
  const input = asObject(value, 'Exercise record must be an object.')
  const values = parseExerciseRecordValues(input)
  const record: ExerciseRecord = {
    id: parseId(input.id, 'Exercise record id'),
    exerciseBlockId: parseId(input.exerciseBlockId, 'Exercise record exerciseBlockId'),
    order: parseNumber(input.order, 'Exercise record order'),
    ...values,
    createdAt: parseIsoDateTime(input.createdAt, 'Exercise record createdAt'),
    updatedAt: parseIsoDateTime(input.updatedAt, 'Exercise record updatedAt'),
  }

  try {
    assertValidOrder(record.order, 'Exercise record')
  } catch (error) {
    throw new ImportFormatError(errorMessage(error))
  }

  return record
}

function parseSettings(value: unknown): AppSettings {
  const input = asObject(value, 'Settings must be an object.')

  if (input.id !== 'app') {
    throw new ImportFormatError('Settings id must be app.')
  }

  return {
    id: 'app',
    ...(input.lastBackupAt === undefined
      ? {}
      : { lastBackupAt: parseIsoDateTime(input.lastBackupAt, 'lastBackupAt') }),
    createdAt: parseIsoDateTime(input.createdAt, 'Settings createdAt'),
    updatedAt: parseIsoDateTime(input.updatedAt, 'Settings updatedAt'),
  }
}

function parseRecordSchema(value: unknown): RecordSchema {
  const input = asObject(value, 'Record schema must be an object.')
  return {
    reps: parseFieldRequirement(input.reps, 'reps'),
    load: parseFieldRequirement(input.load, 'load'),
    duration: parseFieldRequirement(input.duration, 'duration'),
    distance: parseFieldRequirement(input.distance, 'distance'),
    speed: parseFieldRequirement(input.speed, 'speed'),
    incline: parseFieldRequirement(input.incline, 'incline'),
    side: parseFieldRequirement(input.side, 'side'),
  }
}

function parseExerciseRecordValues(input: Record<string, unknown>): ExerciseRecordValues {
  return {
    ...(input.reps === undefined ? {} : { reps: parseNumber(input.reps, 'reps') }),
    ...(input.load === undefined ? {} : { load: parseNumber(input.load, 'load') }),
    ...(input.duration === undefined
      ? {}
      : { duration: parseNumber(input.duration, 'duration') }),
    ...(input.distance === undefined
      ? {}
      : { distance: parseNumber(input.distance, 'distance') }),
    ...(input.speed === undefined ? {} : { speed: parseNumber(input.speed, 'speed') }),
    ...(input.incline === undefined
      ? {}
      : { incline: parseNumber(input.incline, 'incline') }),
    ...(input.side === undefined ? {} : { side: parseSide(input.side) }),
    ...(input.note === undefined ? {} : { note: parseString(input.note, 'note') }),
  }
}

function asObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ImportFormatError(message)
  }

  return value as Record<string, unknown>
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ImportFormatError(`${field} must be an array.`)
  }

  return value
}

function parseId(value: unknown, field: string): string {
  const id = parseString(value, field)

  if (id.trim().length === 0) {
    throw new ImportFormatError(`${field} must not be empty.`)
  }

  return id
}

function parseName(value: unknown, field: string): string {
  const name = parseString(value, field)

  if (name.trim().length === 0) {
    throw new ImportFormatError(`${field} must not be empty.`)
  }

  return name
}

function parseString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ImportFormatError(`${field} must be a string.`)
  }

  return value
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ImportFormatError(`${field} must be a boolean.`)
  }

  return value
}

function parseNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ImportFormatError(`${field} must be a finite number.`)
  }

  return value
}

function parseIsoDateTime(value: unknown, field: string): ISODateTime {
  const timestamp = parseString(value, field)

  if (Number.isNaN(Date.parse(timestamp))) {
    throw new ImportFormatError(`${field} must be an ISO date-time.`)
  }

  return timestamp
}

function parseFieldRequirement(value: unknown, field: string): FieldRequirement {
  if (typeof value !== 'string' || !fieldRequirements.has(value as FieldRequirement)) {
    throw new ImportFormatError(`${field} has an unsupported requirement.`)
  }

  return value as FieldRequirement
}

function parseLoadMode(value: unknown): LoadMode {
  if (typeof value !== 'string' || !loadModes.has(value as LoadMode)) {
    throw new ImportFormatError('loadMode is unsupported.')
  }

  return value as LoadMode
}

function parseSide(value: unknown): Side {
  if (typeof value !== 'string' || !sides.has(value as Side)) {
    throw new ImportFormatError('side is unsupported.')
  }

  return value as Side
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Backup data is invalid.'
}
