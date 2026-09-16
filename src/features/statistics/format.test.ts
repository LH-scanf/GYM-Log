import { describe, expect, it } from 'vitest'
import { formatMetric } from './format'

describe('formatMetric', () => {
  it('drops the floating point tail of Epley 1RM values', () => {
    expect(formatMetric(50.66666666666664)).toBe('50.7')
    expect(formatMetric(101.33333333333333)).toBe('101.3')
  })

  it('keeps integers unchanged', () => {
    expect(formatMetric(80)).toBe('80')
    expect(formatMetric(0)).toBe('0')
  })
})
