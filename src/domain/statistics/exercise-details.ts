import type { Exercise, ExerciseRecord } from '../exercise/types'
import {
  calculateExerciseStatistics,
  estimateOneRepMax,
  type ExerciseHistoryEntry,
  type TrendPoint,
} from './statistics'

export type DetailRange = 'week' | 'month' | 'all'
export type DetailMetric =
  | 'load'
  | 'oneRepMax'
  | 'extraLoad'
  | 'assistance'
  | 'reps'
  | 'duration'
  | 'distance'
  | 'speed'
  | 'incline'

export interface DetailTrend {
  domainStart: string
  domainEnd: string
  points: Partial<Record<DetailMetric, TrendPoint[]>>
}

export interface ExerciseDetailsStatistics {
  trainingCount: number
  recordCount: number
  setCount: number
  maxLoadPerformance?: { load: number; reps: number; date: string }
  maxLoad?: number
  estimatedOneRepMax?: number
  maxExtraLoad?: number
  bodyweightBestReps?: number
  minAssistance?: number
  maxReps?: number
  totalDuration?: number
  totalDistance?: number
  maxSpeed?: number
  maxIncline?: number
  availableMetrics: DetailMetric[]
  trends: Record<DetailRange, DetailTrend>
}

type DatedRecord = { date: string; record: ExerciseRecord }

const sumMetrics = new Set<DetailMetric>(['duration', 'distance'])

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function naturalWeekStart(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return shiftDate(date, -((day + 6) % 7))
}

function naturalMonthEnd(date: string): string {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + 1)
  value.setUTCDate(0)
  return value.toISOString().slice(0, 10)
}

function numericValues(records: ExerciseRecord[], field: keyof ExerciseRecord): number[] {
  return records.flatMap((record) => {
    const value = record[field]
    return typeof value === 'number' && Number.isFinite(value) ? [value] : []
  })
}

function maximum(values: number[]): number | undefined {
  return values.length > 0 ? Math.max(...values) : undefined
}

function minimum(values: number[]): number | undefined {
  return values.length > 0 ? Math.min(...values) : undefined
}

function total(values: number[]): number | undefined {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : undefined
}

function metricValue(
  metric: DetailMetric,
  records: ExerciseRecord[],
  externalStrength: boolean,
): number | undefined {
  if (metric === 'load') {
    const matching = externalStrength
      ? records.filter((record) => (record.load ?? 0) > 0 && (record.reps ?? 0) > 0)
      : records.filter((record) => (record.load ?? 0) > 0)
    return maximum(numericValues(matching, 'load'))
  }
  if (metric === 'oneRepMax') {
    return maximum(
      records.flatMap((record) =>
        (record.load ?? 0) > 0 && (record.reps ?? 0) > 0
          ? [estimateOneRepMax(record.load!, record.reps!)]
          : [],
      ),
    )
  }
  if (metric === 'extraLoad') return maximum(numericValues(records, 'load'))
  if (metric === 'assistance') return minimum(numericValues(records, 'load'))
  if (metric === 'duration' || metric === 'distance') {
    return total(numericValues(records, metric))
  }
  return maximum(numericValues(records, metric))
}

function dailyPoints(
  datedRecords: DatedRecord[],
  metric: DetailMetric,
  externalStrength: boolean,
): TrendPoint[] {
  const byDate = new Map<string, ExerciseRecord[]>()
  for (const { date, record } of datedRecords) {
    byDate.set(date, [...(byDate.get(date) ?? []), record])
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([date, records]) => {
      const value = metricValue(metric, records, externalStrength)
      return value === undefined ? [] : [{ date, value }]
    })
}

function periodPoints(
  daily: TrendPoint[],
  metric: DetailMetric,
  granularity: 'day' | 'week' | 'month',
): TrendPoint[] {
  if (granularity === 'day') return daily
  const grouped = new Map<string, number[]>()
  for (const point of daily) {
    const start =
      granularity === 'week'
        ? naturalWeekStart(point.date)
        : `${point.date.slice(0, 7)}-01`
    grouped.set(start, [...(grouped.get(start) ?? []), point.value])
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      endDate: granularity === 'week' ? shiftDate(date, 6) : naturalMonthEnd(date),
      value: sumMetrics.has(metric)
        ? total(values)!
        : metric === 'assistance'
          ? minimum(values)!
          : maximum(values)!,
    }))
}

function detailMetrics(exercise: Exercise): DetailMetric[] {
  const { recordSchema: schema, loadMode } = exercise
  const metrics: DetailMetric[] = []
  if (schema.load !== 'DISABLED') {
    if (loadMode === 'ASSISTANCE') metrics.push('assistance')
    else if (loadMode === 'BODYWEIGHT_PLUS') metrics.push('extraLoad')
    else if (loadMode === 'EXTERNAL') metrics.push('load')
  }
  if (
    loadMode === 'EXTERNAL' &&
    schema.load !== 'DISABLED' &&
    schema.reps !== 'DISABLED'
  ) {
    metrics.push('oneRepMax')
  }
  if (
    schema.reps !== 'DISABLED' &&
    !(loadMode === 'EXTERNAL' && schema.load !== 'DISABLED')
  )
    metrics.push('reps')
  if (schema.duration !== 'DISABLED') metrics.push('duration')
  if (schema.distance !== 'DISABLED') metrics.push('distance')
  if (schema.speed !== 'DISABLED') metrics.push('speed')
  if (schema.incline !== 'DISABLED') metrics.push('incline')
  return metrics
}

export function calculateExerciseDetails(
  exercise: Exercise,
  entries: ExerciseHistoryEntry[],
  referenceDate: string,
): ExerciseDetailsStatistics {
  const base = calculateExerciseStatistics(exercise, entries)
  const datedRecords = entries.flatMap((entry) =>
    entry.records.map((record) => ({ date: entry.session.date, record })),
  )
  const records = datedRecords.map((item) => item.record)
  const externalStrength =
    exercise.loadMode === 'EXTERNAL' &&
    exercise.recordSchema.load !== 'DISABLED' &&
    exercise.recordSchema.reps !== 'DISABLED'
  const validExternal = datedRecords.filter(
    ({ record }) => (record.load ?? 0) > 0 && (record.reps ?? 0) > 0,
  )
  const maxLoadPerformance = externalStrength
    ? validExternal.sort(
        (left, right) =>
          right.record.load! - left.record.load! ||
          right.record.reps! - left.record.reps! ||
          right.date.localeCompare(left.date),
      )[0]
    : undefined
  const metrics = detailMetrics(exercise)
  const allDaily = Object.fromEntries(
    metrics.map((metric) => [
      metric,
      dailyPoints(datedRecords, metric, externalStrength),
    ]),
  ) as Partial<Record<DetailMetric, TrendPoint[]>>
  const availableMetrics = metrics.filter(
    (metric) =>
      records.length === 0 ||
      (externalStrength && (metric === 'load' || metric === 'oneRepMax')) ||
      (allDaily[metric]?.length ?? 0) > 0,
  )
  const allDates = entries.map((entry) => entry.session.date).sort()
  const firstDate = allDates[0] ?? referenceDate
  const lastDate = allDates.at(-1) ?? referenceDate
  const spanDays =
    Math.round(
      (Date.parse(`${lastDate}T00:00:00Z`) - Date.parse(`${firstDate}T00:00:00Z`)) /
        86_400_000,
    ) + 1
  const allGranularity = spanDays <= 90 ? 'day' : spanDays <= 365 ? 'week' : 'month'
  const ranges: DetailRange[] = ['week', 'month', 'all']
  const trends = Object.fromEntries(
    ranges.map((range) => {
      const start =
        range === 'week' ? shiftDate(referenceDate, -6) : shiftDate(referenceDate, -29)
      const points = Object.fromEntries(
        availableMetrics.map((metric) => {
          const daily = allDaily[metric] ?? []
          const scoped =
            range === 'all'
              ? daily
              : daily.filter(
                  (point) => point.date >= start && point.date <= referenceDate,
                )
          return [
            metric,
            periodPoints(scoped, metric, range === 'all' ? allGranularity : 'day'),
          ]
        }),
      ) as Partial<Record<DetailMetric, TrendPoint[]>>
      const allPoints = Object.values(points).flat()
      return [
        range,
        {
          domainStart:
            range === 'all'
              ? (allPoints.map((point) => point.date).sort()[0] ?? firstDate)
              : start,
          domainEnd:
            range === 'all'
              ? (allPoints
                  .map((point) => point.endDate ?? point.date)
                  .sort()
                  .at(-1) ?? lastDate)
              : referenceDate,
          points,
        },
      ]
    }),
  ) as Record<DetailRange, DetailTrend>

  return {
    trainingCount: base.trainingCount,
    recordCount: base.recordCount,
    setCount: externalStrength ? validExternal.length : base.recordCount,
    ...(maxLoadPerformance === undefined
      ? {}
      : {
          maxLoadPerformance: {
            load: maxLoadPerformance.record.load!,
            reps: maxLoadPerformance.record.reps!,
            date: maxLoadPerformance.date,
          },
        }),
    ...(externalStrength
      ? {
          estimatedOneRepMax: maximum(
            validExternal.map(({ record }) =>
              estimateOneRepMax(record.load!, record.reps!),
            ),
          ),
        }
      : {}),
    ...(exercise.loadMode === 'EXTERNAL' && !externalStrength
      ? { maxLoad: metricValue('load', records, false) }
      : {}),
    ...(exercise.loadMode === 'BODYWEIGHT_PLUS'
      ? {
          maxExtraLoad: metricValue('extraLoad', records, false),
          bodyweightBestReps: maximum(
            numericValues(
              records.filter((record) => record.load === undefined),
              'reps',
            ),
          ),
        }
      : {}),
    ...(exercise.loadMode === 'ASSISTANCE'
      ? { minAssistance: metricValue('assistance', records, false) }
      : {}),
    ...(exercise.recordSchema.reps !== 'DISABLED'
      ? { maxReps: metricValue('reps', records, false) }
      : {}),
    ...(exercise.recordSchema.duration !== 'DISABLED'
      ? { totalDuration: metricValue('duration', records, false) }
      : {}),
    ...(exercise.recordSchema.distance !== 'DISABLED'
      ? { totalDistance: metricValue('distance', records, false) }
      : {}),
    ...(exercise.recordSchema.speed !== 'DISABLED'
      ? { maxSpeed: metricValue('speed', records, false) }
      : {}),
    ...(exercise.recordSchema.incline !== 'DISABLED'
      ? { maxIncline: metricValue('incline', records, false) }
      : {}),
    availableMetrics,
    trends,
  }
}
