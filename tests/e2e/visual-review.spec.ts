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
