import { describe, expect, it } from 'vitest'
import { inferCategory, officialExerciseCategories } from '../../domain/exercise/category'
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

describe('officialExerciseCategories', () => {
  it('has exactly the 41 confirmed exercises with the final categories', () => {
    expect(Object.keys(officialExerciseCategories)).toHaveLength(41)
  })

  it.each([
    // 胸
    ['正常卧推', 'CHEST'],
    ['哑铃卧推', 'CHEST'],
    ['史密斯上斜卧推', 'CHEST'],
    ['蝴蝶机夹胸', 'CHEST'],
    ['器械坐姿推胸', 'CHEST'],
    ['俯卧撑', 'CHEST'],
    ['双力臂', 'CHEST'],
    // 背
    ['坐姿划船（窄距正手）', 'BACK'],
    ['坐姿划船（窄距反手）', 'BACK'],
    ['坐姿划船（宽距正手）', 'BACK'],
    ['坐姿划船（宽距反手）', 'BACK'],
    ['坐姿器械划船（分边）', 'BACK'],
    ['趴姿拉背', 'BACK'],
    ['高位下拉（宽距）', 'BACK'],
    ['高位下拉（窄距）', 'BACK'],
    ['直臂下压', 'BACK'],
    ['引体向上', 'BACK'],
    // 肩
    ['反向蝴蝶机', 'SHOULDERS'],
    ['坐姿器械推肩', 'SHOULDERS'],
    ['坐姿哑铃推肩', 'SHOULDERS'],
    ['侧平举（正手）', 'SHOULDERS'],
    ['侧平举（反手）', 'SHOULDERS'],
    ['龙门架侧平举', 'SHOULDERS'],
    ['龙门架 Y 字侧平举', 'SHOULDERS'],
    ['龙门架农夫侧拉', 'SHOULDERS'],
    ['前平举', 'SHOULDERS'],
    ['绳索面拉', 'SHOULDERS'],
    // 手臂
    ['二头弯举', 'ARMS'],
    // 腿
    ['深蹲', 'LEGS'],
    ['坐姿夹腿', 'LEGS'],
    ['坐姿开腿', 'LEGS'],
    ['坐姿抬腿', 'LEGS'],
    ['坐姿压腿', 'LEGS'],
    ['提踵', 'LEGS'],
    // 腹/核心
    ['仰卧起坐', 'CORE'],
    ['躺姿举腿', 'CORE'],
    ['悬垂举腿', 'CORE'],
    ['正向山羊挺身', 'CORE'],
    ['反向山羊挺身', 'CORE'],
    ['反向山羊举手', 'CORE'],
    // 有氧
    ['爬坡', 'CARDIO'],
  ])('maps %s to %s', (name, category) => {
    expect(officialExerciseCategories[name]).toBe(category)
  })
})
