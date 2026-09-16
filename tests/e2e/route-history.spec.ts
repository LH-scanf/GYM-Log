import { expect, test, type Page } from '@playwright/test'

/**
 * iOS 边缘侧滑会沿着浏览器历史往回走。真机上的问题是：底部 Tab 每切一次都
 * push 一条历史，于是侧滑会把用户一个 Tab 一个 Tab 地拉回去。
 *
 * 约定：
 *  - 底部 Tab 之间的切换是「横向」的，用 replace，不产生历史条目；
 *  - 二级页面（训练详情 / 动作详情 …）是「下钻」，仍然 push，
 *    侧滑才能正确回到打开它的那个 Tab。
 */

async function createExercise(page: Page, name: string) {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill(name)
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises\/[^/]+$/)
}

test('replaces history when switching between the bottom tabs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const nav = page.getByRole('navigation', { name: '主导航' })
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()

  const depth = () => page.evaluate(() => window.history.length)
  const initial = await depth()

  for (const label of ['统计', '动作', '设置', '训练']) {
    await nav.getByRole('link', { name: label }).click()
  }
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()

  // 训练 → 统计 → 训练 之后，历史深度必须和进来时一致。
  expect(await depth()).toBe(initial)

  // 于是 browser back 不会把用户送回 Statistics。
  await page.goBack()
  await expect(page).not.toHaveURL(/\/statistics$/)
})

test('pushes history from the training home into a workout detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createExercise(page, '卧推')

  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name: '卧推' }).click()

  const block = page.locator('.exercise-group').filter({ hasText: '卧推' })
  await block.getByLabel('重量').fill('40')
  await block.getByLabel('次数').fill('8')
  await block.getByRole('button', { name: '保存这一组' }).click()
  await page.getByLabel('结束时间').fill('19:00')
  await page.getByRole('button', { name: '完成训练' }).click()
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()

  await page.locator('.workout-card').first().click()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()
  await expect(page).toHaveURL(/\/workouts\//)

  await page.goBack()
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()
  await expect(page).not.toHaveURL(/\/workouts\//)
})
