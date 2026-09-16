import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
]) {
  test(`keeps the page structure at ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByLabel('日期')).toHaveCount(0)
    await expect(page.getByLabel('开始时间')).toHaveCount(0)
    expect(
      await page
        .locator('body')
        .evaluate((body) => body.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '新建训练' }).click()
    await expect(page.getByRole('dialog', { name: '新建训练' })).toBeVisible()
    await page.getByRole('button', { name: '开始训练' }).click()
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeHidden()
    await page.goto('/exercises')
    await expect(page.getByText('动作族只用于组织相关变式')).toHaveCount(0)
    expect(
      await page
        .locator('body')
        .evaluate((body) => body.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.goto('/statistics')
    await expect(page.locator('.heatmap-grid')).toHaveCount(1)
    await expect(page.locator('.heatmap-day')).toHaveCount(371)
  })
}
