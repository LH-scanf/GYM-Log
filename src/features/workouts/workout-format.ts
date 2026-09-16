import type { Exercise, ExerciseRecord } from '../../domain/exercise/types'

export function formatRecord(record: ExerciseRecord, exercise?: Exercise): string {
  const load =
    record.load === undefined
      ? exercise?.loadMode === 'BODYWEIGHT_PLUS'
        ? '自重'
        : ''
      : `${exercise?.loadMode === 'BODYWEIGHT_PLUS' ? '+' : ''}${record.load}kg${exercise?.loadMode === 'ASSISTANCE' ? '辅助' : ''}`
  return [
    load,
    record.reps === undefined ? '' : `${record.reps}次`,
    record.duration === undefined ? '' : `${record.duration}min`,
    record.distance === undefined ? '' : `${record.distance}km`,
    record.speed === undefined ? '' : `${record.speed}km/h`,
    record.incline === undefined ? '' : `坡度${record.incline}`,
    record.side === 'LEFT'
      ? '左'
      : record.side === 'RIGHT'
        ? '右'
        : record.side === 'BOTH'
          ? '双侧'
          : '',
  ]
    .filter(Boolean)
    .join(' × ')
}

/** 统计页的累计时长。`formatCompactDuration` 会输出 `1h0min`，这里去掉多余的 `0min`。 */
export function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined) return '未填写结束时间'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}min`
  return rest === 0 ? `${hours}h` : `${hours}h${rest}min`
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

export function weekdayOf(date: string): string {
  return weekdays[new Date(`${date}T12:00:00`).getDay()] ?? ''
}

export function formatSessionHeading(date: string | undefined): string {
  if (date === undefined) return '未设置日期'
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (matched === null) return date
  return `${Number(matched[2])}月${Number(matched[3])}日 · 周${weekdayOf(date)}`
}

/** `2026-09-16` → `9月16日`（跨年时带 `2025年` 前缀），不带星期。 */
export function formatCompactDate(date: string | undefined): string {
  if (date === undefined) return '未设置日期'
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (matched === null) return date
  const year = Number(matched[1])
  const prefix = year === new Date().getFullYear() ? '' : `${year}年`
  return `${prefix}${Number(matched[2])}月${Number(matched[3])}日`
}

export function formatSessionDate(date: string | undefined): string {
  if (date === undefined) return '未设置日期'
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (matched === null) return date
  return `${formatCompactDate(date)} 周${weekdayOf(date)}`
}

export function formatClock(time: string | undefined): string {
  return time === undefined || time === '' ? '--:--' : time
}

export function formatCompactDuration(minutes: number | undefined): string {
  if (minutes === undefined) return '—'
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h${minutes % 60}min` : `${minutes}min`
}
