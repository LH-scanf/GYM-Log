import type { Exercise, ExerciseRecord } from '../exercise/types'
import type { WorkoutSession } from '../workout/types'
import type { ExerciseBlock } from '../workout/types'
import { calculateWorkoutDuration } from '../workout/duration'

export interface OverviewStatistics {
  year: { count: number; duration: number }
  month: { count: number; duration: number }
}

export interface HeatmapDay {
  date: string
  active: boolean
  count: number
}

export interface TrendPoint {
  date: string
  value: number
}

export interface ExerciseHistoryEntry {
  session: WorkoutSession
  block: ExerciseBlock
  records: ExerciseRecord[]
}

export interface ExerciseStatistics {
  trainingCount: number
  recordCount: number
  maxLoad?: number
  minAssistance?: number
  maxReps?: number
  totalDuration?: number
  longestDuration?: number
  totalDistance?: number
  estimatedOneRepMax?: number
  estimatedOneRepMaxTrend: TrendPoint[]
  loadTrend: TrendPoint[]
  repsTrend: TrendPoint[]
  bodyweightRepsTrend: TrendPoint[]
  durationTrend: TrendPoint[]
  distanceTrend: TrendPoint[]
  speedTrend: TrendPoint[]
  inclineTrend: TrendPoint[]
  fixedLoads: number[]
  fixedLoadReps: (load: number) => TrendPoint[]
}

function summary(sessions: WorkoutSession[]): { count: number; duration: number } {
  return {
    count: sessions.length,
    duration: sessions.reduce(
      (total, session) =>
        total + (calculateWorkoutDuration(session.startTime, session.endTime) ?? 0),
      0,
    ),
  }
}

export function calculateOverview(
  sessions: WorkoutSession[],
  referenceDate: string,
): OverviewStatistics {
  const year = referenceDate.slice(0, 4)
  const month = referenceDate.slice(0, 7)
  return {
    year: summary(sessions.filter((session) => session.date.startsWith(year))),
    month: summary(sessions.filter((session) => session.date.startsWith(month))),
  }
}

export function createHeatmap(year: number, sessions: WorkoutSession[]): HeatmapDay[] {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    if (session.date.startsWith(`${year}-`)) {
      counts.set(session.date, (counts.get(session.date) ?? 0) + 1)
    }
  }
  const days: HeatmapDay[] = []
  for (
    let date = new Date(Date.UTC(year, 0, 1));
    date.getUTCFullYear() === year;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const key = date.toISOString().slice(0, 10)
    const count = counts.get(key) ?? 0
    days.push({ date: key, count, active: count > 0 })
  }
  return days
}

function groupedRecords(
  entries: ExerciseHistoryEntry[],
): Array<{ date: string; records: ExerciseRecord[] }> {
  const grouped = new Map<string, { date: string; records: ExerciseRecord[] }>()
  for (const entry of entries) {
    const current = grouped.get(entry.session.id) ?? {
      date: entry.session.date,
      records: [],
    }
    current.records.push(...entry.records)
    grouped.set(entry.session.id, current)
  }
  return [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date))
}

function maximum(
  records: ExerciseRecord[],
  property: keyof ExerciseRecord,
): number | undefined {
  const values = records
    .map((record) => record[property])
    .filter((value): value is number => typeof value === 'number')
  return values.length ? Math.max(...values) : undefined
}

function minimum(
  records: ExerciseRecord[],
  property: keyof ExerciseRecord,
): number | undefined {
  const values = records
    .map((record) => record[property])
    .filter((value): value is number => typeof value === 'number')
  return values.length ? Math.min(...values) : undefined
}

function trend(
  grouped: Array<{ date: string; records: ExerciseRecord[] }>,
  property: keyof ExerciseRecord,
  aggregate: typeof maximum | typeof minimum = maximum,
): TrendPoint[] {
  return grouped.flatMap(({ date, records }) => {
    const value = aggregate(records, property)
    return value === undefined ? [] : [{ date, value }]
  })
}

export function calculateExerciseStatistics(
  exercise: Exercise,
  entries: ExerciseHistoryEntry[],
): ExerciseStatistics {
  const grouped = groupedRecords(entries)
  const records = grouped.flatMap((item) => item.records)
  const fixedLoads = [
    ...new Set(
      records.flatMap((record) => (record.load === undefined ? [] : [record.load])),
    ),
  ].sort((a, b) => a - b)
  const external = exercise.loadMode === 'EXTERNAL'
  const assistance = exercise.loadMode === 'ASSISTANCE'
  const cardio = exercise.recordSchema.duration !== 'DISABLED'
  const oneRepMax = external
    ? maximum(
        records
          .filter((record) => (record.load ?? 0) > 0 && (record.reps ?? 0) > 0)
          .map((record) => ({ ...record, load: record.load! * (1 + record.reps! / 30) })),
        'load',
      )
    : undefined
  const estimatedOneRepMaxTrend = external
    ? grouped.flatMap(({ date, records: sessionRecords }) => {
        const values = sessionRecords
          .filter((record) => (record.load ?? 0) > 0 && (record.reps ?? 0) > 0)
          .map((record) => record.load! * (1 + record.reps! / 30))
        return values.length ? [{ date, value: Math.max(...values) }] : []
      })
    : []

  return {
    trainingCount: grouped.length,
    recordCount: records.length,
    ...(external || exercise.loadMode === 'BODYWEIGHT_PLUS'
      ? { maxLoad: maximum(records, 'load') }
      : {}),
    ...(assistance ? { minAssistance: minimum(records, 'load') } : {}),
    ...(!cardio ? { maxReps: maximum(records, 'reps') } : {}),
    ...(cardio
      ? {
          totalDuration: records.reduce((sum, record) => sum + (record.duration ?? 0), 0),
          longestDuration: Math.max(
            0,
            ...grouped.map((item) =>
              item.records.reduce((sum, record) => sum + (record.duration ?? 0), 0),
            ),
          ),
          totalDistance: records.reduce((sum, record) => sum + (record.distance ?? 0), 0),
        }
      : {}),
    ...(oneRepMax === undefined ? {} : { estimatedOneRepMax: oneRepMax }),
    estimatedOneRepMaxTrend,
    loadTrend: trend(grouped, 'load', assistance ? minimum : maximum),
    repsTrend: trend(grouped, 'reps'),
    bodyweightRepsTrend:
      exercise.loadMode === 'BODYWEIGHT_PLUS'
        ? grouped.flatMap(({ date, records: sessionRecords }) => {
            const value = maximum(
              sessionRecords.filter((record) => record.load === undefined),
              'reps',
            )
            return value === undefined ? [] : [{ date, value }]
          })
        : [],
    durationTrend: grouped.flatMap(({ date, records: sessionRecords }) => {
      const value = sessionRecords.reduce(
        (sum, record) => sum + (record.duration ?? 0),
        0,
      )
      return value > 0 ? [{ date, value }] : []
    }),
    distanceTrend: grouped.flatMap(({ date, records: sessionRecords }) => {
      const value = sessionRecords.reduce(
        (sum, record) => sum + (record.distance ?? 0),
        0,
      )
      return value > 0 ? [{ date, value }] : []
    }),
    speedTrend: trend(grouped, 'speed'),
    inclineTrend: trend(grouped, 'incline'),
    fixedLoads,
    fixedLoadReps: (load) =>
      grouped.flatMap(({ date, records: sessionRecords }) => {
        const value = maximum(
          sessionRecords.filter((record) => record.load === load),
          'reps',
        )
        return value === undefined ? [] : [{ date, value }]
      }),
  }
}
