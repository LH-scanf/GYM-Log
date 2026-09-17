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

  it('does not overwrite an existing category on an official exercise', async () => {
    // 正式动作已有分类（即使与官方值不一致，例如用户手动改过），必须尊重、不覆盖。
    await database.exercises.add(legacyExercise('反向蝴蝶机', 'OTHER'))

    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)

    const fixed = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '反向蝴蝶机',
    )
    expect(fixed?.category).toBe('OTHER')
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

  it('does not overwrite a manually changed category across repeated reconciles', async () => {
    // 用户手动把正式动作「深蹲」从 LEGS 改成 OTHER，之后多次进入动作页触发 reconcile，
    // 必须始终尊重手动值，不得改回 LEGS。
    await database.exercises.add(legacyExercise('深蹲', 'OTHER'))

    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)
    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)
    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)

    const fixed = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '深蹲',
    )
    expect(fixed?.category).toBe('OTHER')
  })

  it('does not overwrite a category restored from backup', async () => {
    // 备份恢复回来的动作带有 category，reconcile 不得覆盖它们。
    // （模拟 replace-all 恢复后直接写入的、含 category 的动作数据。）
    await database.exercises.add(legacyExercise('卧推', 'ARMS'))

    await service.reconcileExerciseCategories(officialExerciseCategories, inferCategory)

    const restored = (await service.listExercises(true)).find(
      (exercise) => exercise.name === '卧推',
    )
    expect(restored?.category).toBe('ARMS')
  })
})
