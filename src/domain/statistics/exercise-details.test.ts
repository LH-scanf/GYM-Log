import { describe, expect, it } from 'vitest'
import type { Exercise, ExerciseRecord, RecordSchema } from '../exercise/types'
import type { ExerciseHistoryEntry } from './statistics'
import { calculateExerciseDetails } from './exercise-details'

const strengthSchema: RecordSchema = {
  reps: 'REQUIRED',
  load: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
}

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'bench',
    name: '杠铃卧推',
    category: 'CHEST',
    recordSchema: strengthSchema,
    loadMode: 'EXTERNAL',
    archived: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function history(
  data: Array<{ date: string; values: Array<Partial<ExerciseRecord>> }>,
): ExerciseHistoryEntry[] {
  return data.map(({ date, values }, index) => ({
    session: {
      id: `session-${index}`,
      date,
      createdAt: '',
      updatedAt: '',
    },
    block: {
      id: `block-${index}`,
      sessionId: `session-${index}`,
      exerciseId: 'bench',
      order: index,
      createdAt: '',
      updatedAt: '',
    },
    records: values.map((value, recordIndex) => ({
      id: `record-${index}-${recordIndex}`,
      exerciseBlockId: `block-${index}`,
      order: recordIndex,
      createdAt: '',
      updatedAt: '',
      ...value,
    })),
  }))
}

describe('exercise detail statistics', () => {
  it('keeps the best reps at the heaviest valid load and merges same-day sessions', () => {
    const details = calculateExerciseDetails(
      exercise(),
      history([
        { date: '2026-09-08', values: [{ load: 70, reps: 10 }] },
        { date: '2026-09-09', values: [{ load: 100, reps: 5 }] },
        { date: '2026-10-01', values: [{ load: 80, reps: 8 }] },
        { date: '2026-10-02', values: [{ load: 100, reps: 8 }] },
        { date: '2026-10-02', values: [{ load: 90, reps: 10 }] },
        { date: '2026-10-08', values: [{ load: 110 }, { load: 0, reps: 10 }] },
      ]),
      '2026-10-08',
    )
    expect(details.trainingCount).toBe(6)
    expect(details.recordCount).toBe(7)
    expect(details.setCount).toBe(5)
    expect(details.maxLoadPerformance).toEqual({
      load: 100,
      reps: 8,
      date: '2026-10-02',
    })
    expect(details.estimatedOneRepMax).toBeCloseTo(126.6667)
    expect(details.availableMetrics).toEqual(['load', 'oneRepMax'])
    expect(details.trends.week.points.load).toEqual([{ date: '2026-10-02', value: 100 }])
    expect(details.trends.month.points.load?.map((point) => point.date)).toEqual([
      '2026-09-09',
      '2026-10-01',
      '2026-10-02',
    ])
    expect(details.trends.month.points.oneRepMax?.at(-1)?.value).toBeCloseTo(126.6667)
    expect(details.trends.all.points.load).toHaveLength(4)
  })

  it('uses natural weeks and months for long histories without adding zero dates', () => {
    const weekly = calculateExerciseDetails(
      exercise(),
      history([
        { date: '2025-09-01', values: [{ load: 60, reps: 8 }] },
        { date: '2025-12-31', values: [{ load: 90, reps: 5 }] },
        { date: '2026-01-02', values: [{ load: 100, reps: 5 }] },
      ]),
      '2026-01-02',
    )
    expect(weekly.trends.all.points.load).toEqual([
      { date: '2025-09-01', endDate: '2025-09-07', value: 60 },
      { date: '2025-12-29', endDate: '2026-01-04', value: 100 },
    ])

    const monthly = calculateExerciseDetails(
      exercise(),
      history([
        { date: '2024-01-15', values: [{ load: 50, reps: 8 }] },
        { date: '2025-02-01', values: [{ load: 80, reps: 8 }] },
        { date: '2025-02-20', values: [{ load: 90, reps: 5 }] },
      ]),
      '2025-02-20',
    )
    expect(monthly.trends.all.points.load).toEqual([
      { date: '2024-01-01', endDate: '2024-01-31', value: 50 },
      { date: '2025-02-01', endDate: '2025-02-28', value: 90 },
    ])
  })

  it('adapts bodyweight, assistance, reps, and cardio without a false 1RM', () => {
    const bodyweight = calculateExerciseDetails(
      exercise({ loadMode: 'BODYWEIGHT_PLUS', name: '反向山羊挺身' }),
      history([{ date: '2026-10-08', values: [{ reps: 20 }, { load: 5, reps: 10 }] }]),
      '2026-10-08',
    )
    expect(bodyweight.maxExtraLoad).toBe(5)
    expect(bodyweight.bodyweightBestReps).toBe(20)
    expect(bodyweight.availableMetrics).toEqual(['extraLoad', 'reps'])
    expect(bodyweight.estimatedOneRepMax).toBeUndefined()

    const assistance = calculateExerciseDetails(
      exercise({ loadMode: 'ASSISTANCE', name: '辅助引体向上' }),
      history([
        {
          date: '2026-10-08',
          values: [
            { load: 55, reps: 8 },
            { load: 45, reps: 6 },
          ],
        },
      ]),
      '2026-10-08',
    )
    expect(assistance.minAssistance).toBe(45)
    expect(assistance.trends.week.points.assistance).toEqual([
      { date: '2026-10-08', value: 45 },
    ])
    expect(assistance.availableMetrics).not.toContain('oneRepMax')

    const repsOnly = calculateExerciseDetails(
      exercise({
        loadMode: 'NONE',
        name: '卷腹',
        recordSchema: { ...strengthSchema, load: 'DISABLED' },
      }),
      history([{ date: '2026-10-08', values: [{ reps: 20 }, { reps: 25 }] }]),
      '2026-10-08',
    )
    expect(repsOnly.maxReps).toBe(25)
    expect(repsOnly.availableMetrics).toEqual(['reps'])

    const cardio = calculateExerciseDetails(
      exercise({
        loadMode: 'NONE',
        name: '爬坡',
        recordSchema: {
          ...strengthSchema,
          reps: 'DISABLED',
          load: 'DISABLED',
          duration: 'REQUIRED',
          distance: 'OPTIONAL',
          speed: 'OPTIONAL',
          incline: 'OPTIONAL',
        },
      }),
      history([
        { date: '2026-10-08', values: [{ duration: 20, speed: 5, incline: 10 }] },
        { date: '2026-10-08', values: [{ duration: 30, speed: 6, incline: 12 }] },
      ]),
      '2026-10-08',
    )
    expect(cardio.totalDuration).toBe(50)
    expect(cardio.totalDistance).toBeUndefined()
    expect(cardio.availableMetrics).toEqual(['duration', 'speed', 'incline'])
    expect(cardio.trends.week.points.duration).toEqual([
      { date: '2026-10-08', value: 50 },
    ])
  })

  it('returns empty trends and no invented values for an exercise without records', () => {
    const details = calculateExerciseDetails(exercise(), [], '2026-10-08')
    expect(details.setCount).toBe(0)
    expect(details.maxLoadPerformance).toBeUndefined()
    expect(details.estimatedOneRepMax).toBeUndefined()
    expect(details.trends.week.points.load).toEqual([])
    expect(details.trends.all.points.oneRepMax).toEqual([])
  })
})
