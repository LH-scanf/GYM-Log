import { describe, expect, it } from 'vitest'
import { inferCategory } from '../../domain/exercise/category'
import { categoryLabel } from './exercise-category'

describe('inferCategory', () => {
  it.each([
    ['卧推', 'CHEST'],
    ['上斜卧推', 'CHEST'],
    ['哑铃飞鸟', 'CHEST'],
    ['俯卧撑', 'CHEST'],
    ['坐姿划船', 'BACK'],
    ['高位下拉', 'BACK'],
    ['引体向上', 'BACK'],
    ['硬拉', 'BACK'],
    ['山羊挺身', 'BACK'],
    ['哑铃推举', 'SHOULDERS'],
    ['侧平举', 'SHOULDERS'],
    ['前平举', 'SHOULDERS'],
    ['二头弯举', 'ARMS'],
    ['臂屈伸', 'ARMS'],
    ['锤式弯举', 'ARMS'],
    ['深蹲', 'LEGS'],
    ['腿举', 'LEGS'],
    ['箭步蹲', 'LEGS'],
    ['提踵', 'LEGS'],
    ['卷腹', 'CORE'],
    ['举腿', 'CORE'],
    ['平板支撑', 'CORE'],
    ['跑步', 'CARDIO'],
    ['跳绳', 'CARDIO'],
    ['动感单车', 'CARDIO'],
    ['划船机', 'CARDIO'],
  ])('maps %s to %s', (name, category) => {
    expect(inferCategory(name)).toBe(category)
  })

  it('falls back to OTHER for unknown names', () => {
    expect(inferCategory('某种未知动作')).toBe('OTHER')
    expect(inferCategory('')).toBe('OTHER')
  })
})

describe('categoryLabel', () => {
  it('labels a category', () => {
    expect(categoryLabel('CHEST')).toBe('胸')
    expect(categoryLabel('CARDIO')).toBe('有氧')
  })

  it('treats an undefined category as OTHER', () => {
    expect(categoryLabel(undefined)).toBe('其他')
  })
})
