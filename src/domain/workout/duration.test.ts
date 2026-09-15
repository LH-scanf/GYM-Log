import { describe, expect, it } from 'vitest'
import { calculateWorkoutDuration } from './duration'

describe('calculateWorkoutDuration', () => {
  it('calculates a same-day manually entered workout duration', () => {
    expect(calculateWorkoutDuration('18:12', '19:31')).toBe(79)
  })

  it('returns undefined while an end time is not filled in', () => {
    expect(calculateWorkoutDuration('20:07', undefined)).toBeUndefined()
  })

  it('treats an earlier end time as the next day', () => {
    expect(calculateWorkoutDuration('23:20', '00:35')).toBe(75)
  })
})
