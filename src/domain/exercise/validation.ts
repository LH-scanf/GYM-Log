import { ValidationError } from '../errors'
import type {
  Exercise,
  ExerciseRecordValues,
  FieldRequirement,
  LoadMode,
  RecordSchema,
  Side,
} from './types'

const fieldNames = [
  'reps',
  'load',
  'duration',
  'distance',
  'speed',
  'incline',
  'side',
] as const

type RecordField = (typeof fieldNames)[number]

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

export function assertValidRecordSchema(schema: RecordSchema, loadMode: LoadMode): void {
  const requirements = fieldNames.map((field) => schema[field])

  if (requirements.some((requirement) => !fieldRequirements.has(requirement))) {
    throw new ValidationError('Record schema contains an unsupported field requirement.')
  }

  if (requirements.every((requirement) => requirement === 'DISABLED')) {
    throw new ValidationError('At least one record field must be enabled.')
  }

  if (!loadModes.has(loadMode)) {
    throw new ValidationError('Exercise contains an unsupported load mode.')
  }

  if (schema.load === 'DISABLED' && loadMode !== 'NONE') {
    throw new ValidationError('A disabled load field requires NONE load mode.')
  }

  if (schema.load !== 'DISABLED' && loadMode === 'NONE') {
    throw new ValidationError('An enabled load field requires an explicit load mode.')
  }
}

export function validateExerciseRecord(
  exercise: Pick<Exercise, 'recordSchema' | 'loadMode'>,
  values: ExerciseRecordValues,
  options: { allowHistoricalFields?: boolean } = {},
): void {
  assertValidRecordSchema(exercise.recordSchema, exercise.loadMode)

  for (const field of fieldNames) {
    validateFieldRequirement(field, exercise.recordSchema[field], values[field], options)
  }

  validateNumbers(values)

  if (values.side !== undefined && !sides.has(values.side)) {
    throw new ValidationError('Record side must be LEFT, RIGHT, or BOTH.')
  }
}

function validateFieldRequirement(
  field: RecordField,
  requirement: FieldRequirement,
  value: ExerciseRecordValues[RecordField],
  options: { allowHistoricalFields?: boolean },
): void {
  if (
    requirement === 'REQUIRED' &&
    !options.allowHistoricalFields &&
    value === undefined
  ) {
    throw new ValidationError(`${field} is required for this exercise.`)
  }

  if (
    requirement === 'DISABLED' &&
    value !== undefined &&
    !options.allowHistoricalFields
  ) {
    throw new ValidationError(`${field} is disabled for this exercise.`)
  }
}

function validateNumbers(values: ExerciseRecordValues): void {
  assertFiniteNumber(values.load, 'load', 0)
  assertFiniteNumber(values.duration, 'duration', Number.MIN_VALUE)
  assertFiniteNumber(values.distance, 'distance', 0)
  assertFiniteNumber(values.speed, 'speed', 0)
  assertFiniteNumber(values.incline, 'incline', 0)

  if (values.reps !== undefined) {
    if (
      !Number.isFinite(values.reps) ||
      !Number.isInteger(values.reps) ||
      values.reps <= 0
    ) {
      throw new ValidationError('reps must be a positive integer.')
    }
  }
}

function assertFiniteNumber(
  value: number | undefined,
  field: string,
  minimum: number,
): void {
  if (value !== undefined && (!Number.isFinite(value) || value < minimum)) {
    throw new ValidationError(
      `${field} must be a finite number greater than or equal to ${minimum}.`,
    )
  }
}
