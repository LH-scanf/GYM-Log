import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGymLogDatabase } from '../data/db/database-factory'
import { ExerciseRepository } from '../data/repositories/exercise-repository'
import { GymLogDatabase } from '../data/db/gym-log-database'
import { WorkoutRepository } from '../data/repositories/workout-repository'
import { StatisticsService } from './statistics-service'

const schema = {
  reps: 'REQUIRED',
  load: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
} as const

describe('StatisticsService', () => {
  let database: GymLogDatabase
  let service: StatisticsService
  let exercises: ExerciseRepository
  let workouts: WorkoutRepository
  beforeEach(async () => {
    database = createGymLogDatabase(`statistics-${crypto.randomUUID()}`)
    await database.open()
    service = new StatisticsService(database)
    exercises = new ExerciseRepository(database)
    workouts = new WorkoutRepository(database)
  })
  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('reads live raw data for renamed and archived exercises', async () => {
    const bench = await exercises.create({
      name: '卧推',
      recordSchema: schema,
      loadMode: 'EXTERNAL',
    })
    const workout = await workouts.createSession({
      date: '2026-09-15',
      startTime: '23:20',
      endTime: '00:35',
    })
    const firstBlock = await workouts.addExerciseBlock(workout.id, bench.id)
    const secondBlock = await workouts.addExerciseBlock(workout.id, bench.id)
    const firstRecord = await workouts.addExerciseRecord(firstBlock.id, {
      load: 80,
      reps: 8,
    })
    await workouts.addExerciseRecord(secondBlock.id, { load: 90, reps: 5 })

    expect(await service.overview('2026-09-15')).toEqual({
      year: { count: 1, duration: 75 },
      month: { count: 1, duration: 75 },
    })
    expect((await service.exerciseStatistics(bench.id))?.trainingCount).toBe(1)
    expect(
      (await service.exerciseDetails(bench.id, '2026-09-15'))?.statistics
        .maxLoadPerformance,
    ).toEqual({
      load: 90,
      reps: 5,
      date: '2026-09-15',
    })
    expect(
      await service.exerciseDetails('missing-exercise', '2026-09-15'),
    ).toBeUndefined()
    await exercises.rename(bench.id, '杠铃卧推')
    await exercises.archive(bench.id)
    expect(
      (await service.exerciseDetails(bench.id, '2026-09-15'))?.exercise,
    ).toMatchObject({
      name: '杠铃卧推',
      archived: true,
    })
    await workouts.updateExerciseRecord(firstRecord.id, { load: 100, reps: 3 })
    expect((await service.exerciseStatistics(bench.id))?.maxLoad).toBe(100)
    expect(
      (await service.exerciseDetails(bench.id, '2026-09-15'))?.statistics
        .maxLoadPerformance?.load,
    ).toBe(100)
    await workouts.deleteWorkoutSession(workout.id)
    expect((await service.exerciseStatistics(bench.id))?.trainingCount).toBe(0)
    expect(
      (await service.exerciseDetails(bench.id, '2026-09-15'))?.statistics.setCount,
    ).toBe(0)
  })
})
