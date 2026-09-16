import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const reviewDir = 'output/plan07r-review'
const viewports = [
  { label: '390x844', width: 390, height: 844 },
  { label: '430x932', width: 430, height: 932 },
]

for (const viewport of viewports) {
  test(`captures Plan 07R visual review at ${viewport.label}`, async ({ page }) => {
    mkdirSync(reviewDir, { recursive: true })
    await page.setViewportSize(viewport)
    await page.goto('/exercises/new')
    await page.getByLabel('动作名称').fill(`视觉卧推-${viewport.width}`)
    await page.getByLabel('重量').selectOption('REQUIRED')
    await page.getByLabel('普通负重').check()
    await page.getByRole('button', { name: '保存动作' }).click()
    await page.getByRole('link', { name: '训练' }).click()
    await page.screenshot({
      path: `${reviewDir}/training-home-${viewport.label}.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: '新建训练' }).click()
    await page.getByLabel('开始时间').fill('18:00')
    await page.getByRole('button', { name: '开始训练' }).click()
    await page.screenshot({
      path: `${reviewDir}/active-workout-${viewport.label}.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: '添加动作' }).click()
    await page.screenshot({
      path: `${reviewDir}/exercise-picker-${viewport.label}.png`,
      fullPage: true,
    })
    await page
      .getByRole('button', { name: `视觉卧推-${viewport.width}` })
      .last()
      .click()
    await page.getByLabel('重量').fill('40')
    await page.getByLabel('次数').fill('8')
    await page.getByRole('button', { name: '保存这一组' }).click()
    await expect(page.getByLabel('重量')).toHaveValue('40')
    await page.screenshot({
      path: `${reviewDir}/active-workout-record-${viewport.label}.png`,
      fullPage: true,
    })
    // 统计页的指标卡与趋势卡都需要「已完成 + 有结束时间」的数据才有意义。
    // 完成训练必须等到没有「未完成」徽标才算落地，否则会偶发抢在结束时间的
    // state 提交之前，留下一条没有 duration 的记录（430 那次就这样少了一小时）。
    await page.getByLabel('结束时间').fill('19:00')
    await page.getByRole('button', { name: '完成训练' }).click()
    await expect(page.locator('.workout-card__badge')).toHaveCount(0)
    await page.goto('/exercises')
    await page.screenshot({
      path: `${reviewDir}/exercises-home-${viewport.label}.png`,
      fullPage: true,
    })
    await page.getByRole('link', { name: '新建动作' }).click()
    await page.screenshot({
      path: `${reviewDir}/create-exercise-${viewport.label}.png`,
      fullPage: true,
    })
    // 趋势折线至少要有两个采样点，否则截图里只能看到一个孤零零的圆点。
    await page.goto('/')
    for (const [date, load, reps] of [
      ['2026-08-20', '70', '10'],
      ['2026-09-05', '85', '6'],
    ] as const) {
      await page.getByRole('button', { name: '新建训练' }).click()
      await page.getByLabel('日期').fill(date)
      await expect(page.getByLabel('日期')).toHaveValue(date)
      await page.getByLabel('开始时间').fill('18:00')
      await page.getByRole('button', { name: '开始训练' }).click()
      await page.getByRole('button', { name: '添加动作' }).click()
      const picker = page.getByRole('dialog', { name: '添加动作' })
      await picker
        .getByRole('button', { name: `视觉卧推-${viewport.width}` })
        .first()
        .click()
      await expect(picker).toBeHidden()
      await page.getByLabel('重量').last().fill(load)
      await page.getByLabel('次数').last().fill(reps)
      await page.getByRole('button', { name: '保存这一组' }).last().click()
      await page.getByLabel('结束时间').fill('19:00')
      await page.getByRole('button', { name: '完成训练' }).click()
      await expect(page.locator('.workout-card__badge')).toHaveCount(0)
    }
    await page.goto('/statistics')
    await page.screenshot({
      path: `${reviewDir}/statistics-overview-${viewport.label}.png`,
      fullPage: true,
    })
    await page
      .locator('.heatmap')
      .screenshot({ path: `${reviewDir}/statistics-heatmap-${viewport.label}.png` })
    await page.goto('/settings')
    await page.screenshot({
      path: `${reviewDir}/settings-${viewport.label}.png`,
      fullPage: true,
    })
  })
}
