import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const reviewDir = 'output/plan07r-review'
const viewports = [
  { label: '390x844', width: 390, height: 844 },
  { label: '430x932', width: 430, height: 932 },
]
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

function isoShift(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function dateLabel(date: string, withYear = false): string {
  const value = new Date(`${date}T12:00:00`)
  const prefix = withYear ? `${value.getFullYear()}年` : ''
  return `${prefix}${value.getMonth() + 1}月${value.getDate()}日 周${weekdays[value.getDay()]}`
}

const mondayShift = -((new Date().getDay() + 6) % 7)
const today = isoShift(0)
const thisMonday = isoShift(mondayShift)
const lastSunday = isoShift(mondayShift - 1)
const lastFriday = isoShift(mondayShift - 3)
const lastWednesday = isoShift(mondayShift - 5)
const previousYear = '2025-12-28'

async function createExercise(page: Page, name: string) {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill(name)
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises\/[^/]+$/)
}

async function addExercise(
  page: Page,
  name: string,
  values: { load: number; reps: number },
) {
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name }).first().click()
  const group = page.locator('.exercise-group').filter({ hasText: name }).last()
  await group.getByLabel('重量').fill(String(values.load))
  await group.getByLabel('次数').fill(String(values.reps))
  await group.getByRole('button', { name: '保存这一组' }).click()
  await expect(group.getByRole('button', { name: '保存这一组' })).toHaveCount(0)
}

async function logSession(
  page: Page,
  options: {
    date: string
    startTime: string
    endTime?: string
    exercises: { name: string; load: number; reps: number }[]
  },
) {
  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByLabel('日期').fill(options.date)
  await page.getByLabel('开始时间').fill(options.startTime)
  await page.getByRole('button', { name: '开始训练' }).click()
  for (const exercise of options.exercises) {
    await addExercise(page, exercise.name, exercise)
  }
  if (options.endTime === undefined) {
    await page.getByRole('button', { name: '返回训练' }).click()
  } else {
    await page.getByLabel('结束时间').fill(options.endTime)
    await page.getByRole('button', { name: '完成训练' }).click()
  }
  await expect(page.getByRole('button', { name: '新建训练' })).toBeVisible()
}

test('training home groups history, surfaces unfinished work and stays quiet', async ({
  page,
}) => {
  test.setTimeout(180_000)
  mkdirSync(reviewDir, { recursive: true })
  await page.setViewportSize(viewports[0])

  // 空状态：只有一句「暂无训练记录」，且没有第二个 CTA
  await page.goto('/')
  await expect(page.getByText('暂无训练记录')).toBeVisible()
  await expect(page.locator('.workout-week')).toHaveCount(0)
  await expect(page.locator('.empty-state')).toHaveCount(0)
  await expect(page.locator('.home-header .eyebrow')).toHaveText('GymLog')
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '新建训练' })).toBeVisible()

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.screenshot({
      path: `${reviewDir}/training-home-empty-${viewport.label}.png`,
    })
  }

  for (const name of ['卧推', '高位下拉', '坐姿划船']) {
    await createExercise(page, name)
  }

  await logSession(page, {
    date: previousYear,
    startTime: '18:00',
    endTime: '18:50',
    exercises: [{ name: '卧推', load: 60, reps: 10 }],
  })
  await logSession(page, {
    date: lastWednesday,
    startTime: '20:10',
    exercises: [{ name: '高位下拉', load: 55, reps: 10 }],
  })
  await logSession(page, {
    date: lastFriday,
    startTime: '18:00',
    endTime: '19:31',
    exercises: [
      { name: '卧推', load: 40, reps: 8 },
      { name: '坐姿划船', load: 45, reps: 12 },
    ],
  })
  await logSession(page, {
    date: lastSunday,
    startTime: '18:00',
    endTime: '18:45',
    exercises: [{ name: '高位下拉', load: 50, reps: 10 }],
  })
  await logSession(page, {
    date: thisMonday,
    startTime: '18:00',
    endTime: '19:12',
    exercises: [{ name: '卧推', load: 42.5, reps: 8 }],
  })
  await logSession(page, {
    date: today,
    startTime: '20:30',
    exercises: [
      { name: '高位下拉', load: 52.5, reps: 10 },
      { name: '坐姿划船', load: 45, reps: 12 },
    ],
  })

  await page.goto('/')
  await expect(page.locator('.workout-week')).toHaveCount(3)

  // 最近一条未完成训练：独立 Warning Card，且排在历史之前
  const resume = page.getByRole('button', { name: '继续未完成训练' })
  await expect(resume).toHaveCount(1)
  await expect(resume).toContainText('未完成训练')
  await expect(resume).toContainText(`${dateLabel(today)} · 20:30 – --:--`)
  await expect(resume).toContainText('高位下拉 · 坐姿划船')
  const resumeBox = await resume.boundingBox()
  const firstGroupBox = await page.locator('.workout-week').first().boundingBox()
  expect(resumeBox).not.toBeNull()
  expect(firstGroupBox).not.toBeNull()
  expect(resumeBox!.y).toBeLessThan(firstGroupBox!.y)

  // 分组：本周 / 上周 / 更早
  await expect(page.locator('.workout-week__label')).toHaveText(['本周', '上周', '更早'])

  const thisWeek = page.locator('.workout-week').nth(0)
  await expect(thisWeek.locator('.workout-card')).toHaveCount(1)
  await expect(thisWeek).toContainText(dateLabel(thisMonday))
  await expect(thisWeek).toContainText('18:00 – 19:12 · 1h12min')
  await expect(thisWeek).not.toContainText(String(new Date().getFullYear()))

  // 周日属于上一周，不能被算作本周
  const lastWeek = page.locator('.workout-week').nth(1)
  await expect(lastWeek.locator('.workout-card')).toHaveCount(3)
  await expect(lastWeek.locator('.workout-card').nth(0)).toContainText(
    dateLabel(lastSunday),
  )
  await expect(lastWeek.locator('.workout-card').nth(1)).toContainText(
    dateLabel(lastFriday),
  )
  await expect(lastWeek.locator('.workout-card').nth(1)).toContainText(
    '18:00 – 19:31 · 1h31min',
  )
  await expect(lastWeek.locator('.workout-card').nth(1)).toContainText('卧推 · 坐姿划船')

  // 更早的未完成 Session 留在历史里，只给一个橙色 Badge
  const olderUnfinished = lastWeek.locator('.workout-card').nth(2)
  await expect(olderUnfinished).toContainText(dateLabel(lastWednesday))
  await expect(olderUnfinished).toContainText('20:10 – --:--')
  await expect(olderUnfinished.locator('.workout-card__badge')).toHaveText('未完成')
  await expect(lastWeek.locator('.workout-card__badge')).toHaveCount(1)

  // 跨年补年份，当前年省略
  const earlier = page.locator('.workout-week').nth(2)
  await expect(earlier.locator('.workout-card')).toHaveCount(1)
  await expect(earlier).toContainText(dateLabel(previousYear, true))

  // 页面没有多余文案
  await expect(page.locator('.home-header p:not(.eyebrow)')).toHaveCount(0)
  await expect(page.locator('.family-management')).toHaveCount(0)

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await expect(resume).toBeVisible()
    const hasOverflow = await page
      .locator('body')
      .evaluate((body) => body.scrollWidth > window.innerWidth)
    expect(hasOverflow).toBe(false)
    await page.screenshot({
      path: `${reviewDir}/training-home-populated-${viewport.label}.png`,
    })
  }
})
