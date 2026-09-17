import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGymLogDatabase } from '../data/db/database-factory'
import type { GymLogDatabase } from '../data/db/gym-log-database'
import type { Exercise } from '../domain/exercise/types'
import { officialExerciseCategories, inferCategory } from '../domain/exercise/category'
import { ExerciseManagementService } from './exercise-management-service'

const externalSchema = {
  reps: 'REQUIRED',
  load: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
} as const

/** 直接写一个旧数据形态的 exercise（可缺 category），绕过 create 的自动推断。 */
function legacyExercise(name: string, category?: Exercise['category']): Exercise {
  const timestamp = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    ...(category === undefined ? {} : { category }),
    recordSchema: externalSchema,
    loadMode: 'EXTERNAL',
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

describe('ExerciseManagementService.reconcileExerciseCategories', () => {
  let database: GymLogDatabase
  let service: ExerciseManagementService

  beforeEach(async () => {
    database = createGymLogDatabase(`GymLog-category-${crypto.randomUUID()}`)
    await database.open()
    service = new ExerciseManagementService(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('overwrites a wrong category for an official exercise', async () => {
    // 「反向蝴蝶机」之前被 infer 归成 OTHER/其他，正式分类应是 SHOULDERS。
    await database.exercises.add(legacyExercise('反向蝴蝶机', 'OTHER'))

    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)

    const fixed = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '反向蝴蝶机',
    )
    expect(fixed?.category).toBe('SHOULDERS')
  })

  it('backfills a missing category on an official exercise', async () => {
    await database.exercises.add(legacyExercise('深蹲', undefined))

    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)

    const fixed = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '深蹲',
    )
    expect(fixed?.category).toBe('LEGS')
  })

  it('leaves a correct official category untouched and does not re-infer', async () => {
    await database.exercises.add(legacyExercise('深蹲', 'LEGS'))

    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)

    const fixed = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '深蹲',
    )
    expect(fixed?.category).toBe('LEGS')
  })

  it('only backfills non-official exercises when category is missing', async () => {
    // 非正式库动作：已有分类（哪怕"错误"）也不覆盖。
    await database.exercises.add(legacyExercise('我的自定义动作', 'CARDIO'))
    await database.exercises.add(legacyExercise('另一个自定义动作', undefined))

    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)

    const custom = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '我的自定义动作',
    )
    const fresh = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '另一个自定义动作',
    )
    expect(custom?.category).toBe('CARDIO')
    expect(fresh?.category).toBe('OTHER')
  })
})
