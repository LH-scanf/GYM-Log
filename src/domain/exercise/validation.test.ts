import { describe, expect, it } from 'vitest'
import { ValidationError } from '../errors'
import { validateExerciseRecord } from './validation'
import type { Exercise, RecordSchema } from './types'

const disabled: RecordSchema = {
  reps: 'DISABLED',
  load: 'DISABLED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
}

function exercise(
  recordSchema: RecordSchema,
  loadMode: Exercise['loadMode'],
): Pick<Exercise, 'recordSchema' | 'loadMode'> {
  return { recordSchema, loadMode }
}

describe('schema-driven exercise record validation', () => {
  it('accepts a real external-load bench press record and rejects a missing required load', () => {
    const benchPress = exercise(
      { ...disabled, reps: 'REQUIRED', load: 'REQUIRED' },
      'EXTERNAL',
    )

    expect(() => validateExerciseRecord(benchPress, { load: 40, reps: 10 })).not.toThrow()
    expect(() => validateExerciseRecord(benchPress, { reps: 10 })).toThrow(
      ValidationError,
    )
  })

  it('accepts bodyweight-plus records with and without extra load', () => {
    const reverseHyper = exercise(
      { ...disabled, reps: 'REQUIRED', load: 'OPTIONAL' },
      'BODYWEIGHT_PLUS',
    )

    expect(() => validateExerciseRecord(reverseHyper, { reps: 20 })).not.toThrow()
    expect(() =>
      validateExerciseRecord(reverseHyper, { reps: 10, load: 5 }),
    ).not.toThrow()
  })

  it('supports assistance and cardio schemas without accepting disabled fields', () => {
    const assistedPullUp = exercise(
      { ...disabled, reps: 'REQUIRED', load: 'REQUIRED' },
      'ASSISTANCE',
    )
    const inclineWalk = exercise(
      { ...disabled, duration: 'REQUIRED', speed: 'OPTIONAL', incline: 'OPTIONAL' },
      'NONE',
    )

    expect(() =>
      validateExerciseRecord(assistedPullUp, { load: 50, reps: 10 }),
    ).not.toThrow()
    expect(() =>
      validateExerciseRecord(inclineWalk, { duration: 40, speed: 5, incline: 12 }),
    ).not.toThrow()
    expect(() => validateExerciseRecord(inclineWalk, { duration: 40, load: 5 })).toThrow(
      ValidationError,
    )
  })

  it('rejects invalid numeric values', () => {
    const hangingLegRaise = exercise({ ...disabled, reps: 'REQUIRED' }, 'NONE')

    expect(() => validateExerciseRecord(hangingLegRaise, { reps: 10.5 })).toThrow(
      ValidationError,
    )
    expect(() => validateExerciseRecord(hangingLegRaise, { reps: 0 })).toThrow(
      ValidationError,
    )
  })
})
