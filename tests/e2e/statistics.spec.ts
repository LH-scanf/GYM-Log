import { expect, test, type Page } from '@playwright/test'

function localDate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

async function logWorkout(page: Page, date: string, start: string, end?: string) {
  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByLabel('日期').fill(date)
  await page.getByLabel('开始时间').fill(start)
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await page
    .getByRole('dialog', { name: '添加动作' })
    .getByRole('button', { name: '统计卧推' })
    .first()
    .click()
  await page.getByLabel('重量').fill('80')
  await page.getByLabel('次数').fill('8')
  await page.getByRole('button', { name: '保存这一组' }).click()
  if (end) {
    await page.getByLabel('结束时间').fill(end)
    await expect(page.getByLabel('结束时间')).toHaveValue(end)
  }
  if (end) {
    await page.getByRole('button', { name: '完成训练' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.workout-card__badge')).toHaveCount(0)
  } else {
    await page.getByRole('button', { name: '返回训练' }).click()
    await expect(page).toHaveURL(/\/$/)
  }
}

test('shows only overall training statistics with year switching and date drilldown', async ({
  page,
}) => {
  const today = localDate()
  const year = Number(today.slice(0, 4))
  const previousYearDate = `${year - 1}-06-15`

  await page.goto('/statistics')
  await expect(
    page.getByRole('region', { name: '训练概览' }).locator('.metric-card--year-count'),
  ).toContainText('0 次')
  await expect(page.getByLabel('有训练的日期').getByRole('button')).toHaveCount(0)

  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('统计卧推')
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await logWorkout(page, today, '23:20', '00:35')
  await logWorkout(page, today, '18:00')
  await logWorkout(page, previousYearDate, '17:00', '18:00')
  await page.goto('/statistics')

  const summary = page.getByRole('region', { name: '训练概览' })
  await expect(summary.locator('.metric-card')).toHaveCount(4)
  await expect(summary.locator('.metric-card--year-count')).toContainText('2 次')
  await expect(summary.locator('.metric-card--year-duration')).toContainText('1h15min')
  await expect(summary.locator('.metric-card--month-count')).toContainText('2 次')
  await expect(summary.locator('.metric-card--month-duration')).toContainText('1h15min')
  await expect(page.getByRole('heading', { name: '年度训练热力图' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '趋势' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '动作统计' })).toHaveCount(0)
  await expect(page.getByLabel('搜索动作')).toHaveCount(0)
  await expect(page.locator('.trend-chart')).toHaveCount(0)

  await expect(page.getByLabel('统计年份')).toHaveValue(String(year))
  await page
    .getByLabel('有训练的日期')
    .getByRole('button', { name: `${today} · 2 次` })
    .tap()
  await expect(page.getByRole('heading', { name: `${today} 的训练` })).toBeVisible()
  await expect(page.getByRole('link', { name: /查看训练详情/ })).toHaveCount(2)
  await page
    .getByRole('link', { name: /查看训练详情/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/statistics$/)

  await page.getByLabel('统计年份').selectOption(String(year - 1))
  await expect(summary.locator('.metric-card--year-count')).toContainText('2 次')
  await expect(
    page
      .getByLabel('有训练的日期')
      .getByRole('button', { name: `${previousYearDate} · 1 次` }),
  ).toBeVisible()
  await expect(page.getByLabel(`${year - 1}-06-16，无训练`)).toBeVisible()
  await expect(
    page.getByLabel('有训练的日期').getByRole('button', { name: `${today} · 2 次` }),
  ).toHaveCount(0)
  await page.getByLabel('统计年份').selectOption(String(year))
  await expect(
    page.getByLabel('有训练的日期').getByRole('button', { name: `${today} · 2 次` }),
  ).toBeVisible()
})
