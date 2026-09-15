import { describe, expect, it } from 'vitest'
import type { Exercise, ExerciseRecord } from '../exercise/types'
import type { WorkoutSession } from '../workout/types'
import {
  calculateExerciseStatistics,
  calculateOverview,
  createHeatmap,
  type ExerciseHistoryEntry,
} from './statistics'

const schema = {
  reps: 'DISABLED',
  load: 'DISABLED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
} as const
const session = (
  id: string,
  date: string,
  startTime?: string,
  endTime?: string,
): WorkoutSession => ({
  id,
  date,
  ...(startTime ? { startTime } : {}),
  ...(endTime ? { endTime } : {}),
  createdAt: '',
  updatedAt: '',
})
const exercise = (
  loadMode: Exercise['loadMode'],
  overrides: Partial<Exercise> = {},
): Exercise => ({
  id: 'exercise',
  name: '测试动作',
  recordSchema: schema,
  loadMode,
  archived: false,
  createdAt: '',
  updatedAt: '',
  ...overrides,
})
const record = (id: string, values: Partial<ExerciseRecord>): ExerciseRecord => ({
  id,
  exerciseBlockId: `block-${id}`,
  order: 0,
  createdAt: '',
  updatedAt: '',
  ...values,
})
const history = (
  items: Array<{ session: WorkoutSession; records: ExerciseRecord[] }>,
): ExerciseHistoryEntry[] =>
  items.map((item, index) => ({
    ...item,
    block: {
      id: `block-${index}`,
      sessionId: item.session.id,
      exerciseId: 'exercise',
      order: index,
      createdAt: '',
      updatedAt: '',
    },
  }))

describe('statistics derivation', () => {
  it('counts all sessions but only completed durations, including cross-midnight', () => {
    const sessions = [
      session('a', '2026-09-01', '18:00', '19:00'),
      session('b', '2026-09-02', '23:20', '00:35'),
      session('c', '2026-09-03', '18:00'),
    ]
    expect(calculateOverview(sessions, '2026-09-15')).toEqual({
      year: { count: 3, duration: 135 },
      month: { count: 3, duration: 135 },
    })
    expect(createHeatmap(2026, sessions).filter((day) => day.active)).toEqual([
      { date: '2026-09-01', active: true, count: 1 },
      { date: '2026-09-02', active: true, count: 1 },
      { date: '2026-09-03', active: true, count: 1 },
    ])
    expect(
      createHeatmap(2026, [...sessions, session('duplicate', '2026-09-01')]).find(
        (day) => day.date === '2026-09-01',
      ),
    ).toMatchObject({ active: true, count: 2 })
  })

  it('calculates external load, 1RM and fixed-load trends across duplicate blocks', () => {
    const stats = calculateExerciseStatistics(
      exercise('EXTERNAL'),
      history([
        {
          session: session('one', '2026-09-01'),
          records: [
            record('1', { load: 100, reps: 5 }),
            record('2', { load: 90, reps: 8 }),
          ],
        },
        {
          session: session('two', '2026-09-02'),
          records: [record('3', { load: 100, reps: 6 })],
        },
      ]),
    )
    expect(stats.trainingCount).toBe(2)
    expect(stats.maxLoad).toBe(100)
    expect(stats.estimatedOneRepMax).toBeCloseTo(120)
    expect(stats.estimatedOneRepMaxTrend.map((point) => point.value)).toEqual([
      116.66666666666667, 120,
    ])
    expect(stats.fixedLoadReps(100).map((point) => point.value)).toEqual([5, 6])
  })

  it('calculates bodyweight, assistance, reps-only, and cardio metrics', () => {
    const entries = history([
      {
        session: session('one', '2026-09-01'),
        records: [
          record('1', { reps: 12 }),
          record('2', {
            reps: 8,
            load: 5,
            duration: 20,
            distance: 2,
            speed: 6,
            incline: 8,
          }),
        ],
      },
    ])
    expect(
      calculateExerciseStatistics(exercise('BODYWEIGHT_PLUS'), entries).maxLoad,
    ).toBe(5)
    expect(
      calculateExerciseStatistics(exercise('ASSISTANCE'), entries).minAssistance,
    ).toBe(5)
    expect(calculateExerciseStatistics(exercise('NONE'), entries).maxReps).toBe(12)
    const cardio = calculateExerciseStatistics(
      exercise('NONE', {
        recordSchema: {
          ...schema,
          duration: 'REQUIRED',
          distance: 'OPTIONAL',
          speed: 'OPTIONAL',
          incline: 'OPTIONAL',
        },
      }),
      entries,
    )
    expect(cardio).toMatchObject({
      totalDuration: 20,
      longestDuration: 20,
      totalDistance: 2,
    })
    expect(cardio.speedTrend[0]?.value).toBe(6)
  })
})
