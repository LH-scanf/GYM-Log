import { describe, expect, it } from 'vitest'
import { formatCompactDate, formatDuration, formatSessionDate } from './workout-format'

const thisYear = new Date().getFullYear()
const previousYear = `${thisYear - 1}-12-28`

function weekday(date: string): string {
  const value = new Date(`${date}T12:00:00`)
  return ['日', '一', '二', '三', '四', '五', '六'][value.getDay()] ?? ''
}

describe('formatCompactDate', () => {
  it('drops the year and the weekday inside the current year', () => {
    expect(formatCompactDate(`${thisYear}-09-16`)).toBe('9月16日')
  })

  it('keeps the year when it is not the current one', () => {
    expect(formatCompactDate(previousYear)).toBe(`${thisYear - 1}年12月28日`)
  })

  it('reads the month and the day as numbers, not as zero-padded text', () => {
    expect(formatCompactDate(`${thisYear}-01-05`)).toBe('1月5日')
  })

  it('passes an unparsable value through and names a missing one', () => {
    expect(formatCompactDate('2026/09/16')).toBe('2026/09/16')
    expect(formatCompactDate(undefined)).toBe('未设置日期')
  })
})

describe('formatSessionDate', () => {
  it('is the compact date plus the weekday', () => {
    const date = `${thisYear}-09-16`
    expect(formatSessionDate(date)).toBe(`9月16日 周${weekday(date)}`)
  })

  it('keeps the year prefix for a cross-year session', () => {
    expect(formatSessionDate(previousYear)).toBe(
      `${thisYear - 1}年12月28日 周${weekday(previousYear)}`,
    )
  })
})

describe('formatDuration', () => {
  it('drops a trailing zero-minute part so whole hours stay short', () => {
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(180)).toBe('3h')
  })

  it('keeps both parts when there are leftover minutes', () => {
    expect(formatDuration(226)).toBe('3h46min')
    expect(formatDuration(45)).toBe('45min')
  })
})
