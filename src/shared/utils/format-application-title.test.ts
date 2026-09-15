import { describe, expect, it } from 'vitest'
import { formatApplicationTitle } from './format-application-title'

describe('formatApplicationTitle', () => {
  it('adds the product name to a page title', () => {
    expect(formatApplicationTitle('训练')).toBe('训练 · GymLog')
  })

  it('does not repeat the product name', () => {
    expect(formatApplicationTitle('GymLog')).toBe('GymLog')
  })
})
