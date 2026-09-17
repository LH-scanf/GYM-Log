import type { ExerciseCategory } from '../../domain/exercise/types'

export type { ExerciseCategory }
export { inferCategory } from '../../domain/exercise/category'

/**
 * 动作部位分类的展示顺序与文案。Sheet 顶部筛选 chips 与「已有动作补全」
 * 都依赖这份顺序（胸 → 背 → 肩 → 手臂 → 腿 → 腹 → 有氧 → 其他）。
 */
export const categoryOrder: ReadonlyArray<ExerciseCategory> = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'ARMS',
  'LEGS',
  'CORE',
  'CARDIO',
  'OTHER',
]

export const categoryLabels: Record<ExerciseCategory, string> = {
  CHEST: '胸',
  BACK: '背',
  SHOULDERS: '肩',
  ARMS: '手臂',
  LEGS: '腿',
  CORE: '腹',
  CARDIO: '有氧',
  OTHER: '其他',
}

export function categoryLabel(category: ExerciseCategory | undefined): string {
  return category === undefined ? '其他' : categoryLabels[category]
}
