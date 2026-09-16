import { expect, test } from '@playwright/test'

test('opens overview, a heatmap workout, and exercise statistics', async ({ page }) => {
  // 训练卡片链接的可访问名里含动作名（「统计卧推」），会与本例里的
  // `getByRole('link', { name: '统计' })` 撞车，所以底部 Tab 一律限定在主导航里取。
  const nav = page.getByRole('navigation', { name: '主导航' })

  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('统计卧推')
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()
  await nav.getByRole('link', { name: '训练' }).click()
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByLabel('日期').fill('2026-09-11')
  await page.getByLabel('开始时间').fill('18:00')
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name: '统计卧推' }).click()
  await page.getByLabel('重量').fill('80')
  await page.getByLabel('次数').fill('8')
  await page.getByRole('button', { name: '保存这一组' }).click()
  await page.getByLabel('结束时间').fill('19:00')
  await page.getByRole('button', { name: '完成训练' }).click()

  await nav.getByRole('link', { name: '统计' }).click()
  await expect(page.getByRole('heading', { name: '统计', exact: true })).toBeVisible()
  await page
    .getByLabel('有训练的日期')
    .getByRole('button', { name: '2026-09-11 · 1 次' })
    .click()
  await page.getByRole('link', { name: '查看训练详情' }).click()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()
  await nav.getByRole('link', { name: '统计' }).click()
  await page.getByLabel('搜索动作').fill('统计卧推')
  await page.getByRole('link', { name: '统计卧推' }).click()
  await expect(page.getByText('估算 1RM（Epley）')).toBeVisible()
  await expect(page.getByText('每次训练最大负重')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '统计卧推' })).toBeVisible()
})
