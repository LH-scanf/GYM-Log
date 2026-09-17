import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * 07R-F：动作页与「添加动作」Sheet 按参考图重构。
 * 这里锁定参考图的关键结构，防止退回「大按钮 + 大卡片」的旧实现：
 * - 页头：标题 + 右上角紧凑「新建动作」
 * - 系统搜索框 + 全部/常用/已归档 chips + 排序入口 + 「共 N 个动作」
 * - 族卡片：图标 + 名称 + N 个动作 + 折叠箭头
 * - 动作行：名称 + 摘要 + 常用星标 + 更多菜单（归档收进菜单）
 * - Sheet：搜索 + 最近/常用/全部 chips + 「最近使用 / 未分组」分组 + 行尾加号
 * - 「选择后立即添加」等提示词不得回归
 */

const reviewDir = 'output/plan07r-review'

async function createExercise(page: Page, name: string, family?: string) {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill(name)
  if (family !== undefined) {
    await page.getByLabel('快速新建动作族').fill(family)
    await page.getByRole('button', { name: '新建并选择' }).click()
  }
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises\/[^/]+$/)
}

// 访问一次动作页，触发 category 的一次性补全迁移（幂等）。
async function backfillCategories(page: Page) {
  await page.goto('/exercises')
  await expect(page.getByRole('heading', { name: '动作', exact: true })).toBeVisible()
}

test('exercises page follows the reference structure and keeps row actions', async ({
  page,
}) => {
  mkdirSync(reviewDir, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await createExercise(page, '侧平举（反手）', '肩部')
  await createExercise(page, '二头弯举')

  await page.goto('/exercises')

  // 页头：左标题 + 右上角紧凑按钮（不再是整行大按钮）
  await expect(page.getByRole('heading', { name: '动作', exact: true })).toBeVisible()
  const createButton = page.getByRole('link', { name: '新建动作' })
  const createBox = await createButton.boundingBox()
  expect(createBox).not.toBeNull()
  expect(createBox!.height).toBeLessThanOrEqual(44)
  expect(createBox!.width).toBeLessThan(200)

  // 搜索框 + chips + 排序 + 计数行
  await expect(page.getByLabel('搜索动作或动作族')).toBeVisible()
  const chips = page.getByRole('group', { name: '筛选动作' })
  for (const chip of ['全部', '常用', '已归档']) {
    await expect(chips.getByRole('button', { name: chip, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /默认排序/ })).toBeVisible()
  await expect(page.getByText('共 2 个动作')).toBeVisible()

  // 族卡片：图标 + 名称 + N 个动作；折叠 / 展开
  const shoulderGroup = page.locator('.ex-group').filter({ hasText: '肩部' })
  await expect(shoulderGroup.getByText('1 个动作')).toBeVisible()
  const shoulderHead = shoulderGroup.getByRole('button', { name: /肩部/ })
  await shoulderHead.click()
  await expect(page.getByText('侧平举（反手）')).toHaveCount(0)
  await shoulderHead.click()
  await expect(page.getByText('侧平举（反手）')).toBeVisible()

  // 常用星标 → 「常用」筛选
  const star = shoulderGroup.getByRole('button', { name: '设为常用 侧平举（反手）' })
  await star.click()
  await expect(
    shoulderGroup.getByRole('button', { name: '取消常用 侧平举（反手）' }),
  ).toBeVisible()
  await chips.getByRole('button', { name: '常用', exact: true }).click()
  await expect(page.getByText('侧平举（反手）')).toBeVisible()
  await expect(page.getByText('二头弯举')).toHaveCount(0)
  await chips.getByRole('button', { name: '全部', exact: true }).click()

  // 更多菜单收纳归档；搜索可用
  const row = page.locator('.ex-row').filter({ hasText: '二头弯举' })
  await page.getByLabel('搜索动作或动作族').fill('二头')
  await row.getByRole('button', { name: '二头弯举 更多操作' }).click()
  const menu = page.getByRole('dialog', { name: '二头弯举' })
  await expect(menu.getByRole('button', { name: '归档' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await menu.getByRole('button', { name: '归档' }).click()
  await expect(page.getByText('二头弯举')).toHaveCount(0)
  await page.getByLabel('搜索动作或动作族').fill('')

  expect(
    await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth),
  ).toBe(true)
  await page.screenshot({
    path: `${reviewDir}/exercises-redesign-390x844.png`,
    fullPage: true,
  })
})

test('add exercise sheet follows the reference structure', async ({ page }) => {
  mkdirSync(reviewDir, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await createExercise(page, '侧平举（反手）')
  await createExercise(page, '二头弯举')
  await backfillCategories(page)

  // 先完成一次训练，让「最近使用」有真实数据
  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  const firstPicker = page.getByRole('dialog', { name: '添加动作' })
  await firstPicker
    .getByRole('group', { name: '筛选动作' })
    .getByRole('button', { name: '全部' })
    .click()
  await firstPicker
    .locator('.picker-ex-row')
    .filter({ hasText: '侧平举（反手）' })
    .click()
  await page.getByLabel('重量').fill('40')
  await page.getByLabel('次数').fill('8')
  await page.getByRole('button', { name: '保存这一组' }).click()
  await page.getByLabel('结束时间').fill('19:00')
  await page.getByRole('button', { name: '完成训练' }).click()
  await expect(page.locator('.workout-card__badge')).toHaveCount(0)

  // 再次进入训练，检查 Sheet 结构
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  const picker = page.getByRole('dialog', { name: '添加动作' })
  await expect(picker).toBeVisible()

  await expect(picker.getByLabel('搜索动作')).toBeVisible()
  const chips = picker.getByRole('group', { name: '筛选动作' })
  // 顶部筛选栏：最近 / 常用 + 八个部位 + 全部
  for (const chip of [
    '最近',
    '常用',
    '胸',
    '背',
    '肩',
    '手臂',
    '腿',
    '腹',
    '有氧',
    '全部',
  ]) {
    await expect(chips.getByRole('button', { name: chip, exact: true })).toBeVisible()
  }
  await expect(picker.getByText('最近使用')).toBeVisible()
  await expect(page.getByText('选择后立即添加')).toHaveCount(0)

  // 行尾加号视觉存在；点击行即添加
  const recentRow = picker.locator('.picker-ex-row').filter({ hasText: '侧平举（反手）' })
  await expect(recentRow.locator('.picker-ex-row__add')).toBeVisible()
  await recentRow.click()
  await expect(picker).toBeHidden()
  await expect(page.locator('.exercise-group')).toHaveCount(1)

  // 部位筛选：「侧平举」归类为肩，「二头弯举」归类为手臂
  await page.getByRole('button', { name: '添加动作' }).click()
  const pickerShoulder = page.getByRole('dialog', { name: '添加动作' })
  await pickerShoulder
    .getByRole('group', { name: '筛选动作' })
    .getByRole('button', { name: '肩' })
    .click()
  await expect(
    pickerShoulder.locator('.picker-ex-row').filter({ hasText: '侧平举（反手）' }),
  ).toBeVisible()
  await expect(
    pickerShoulder.locator('.picker-ex-row').filter({ hasText: '二头弯举' }),
  ).toHaveCount(0)

  // 「常用」tab：还没有星标时给出轻提示
  await pickerShoulder
    .getByRole('group', { name: '筛选动作' })
    .getByRole('button', { name: '常用' })
    .click()
  await expect(pickerShoulder.getByText('还没有常用动作。')).toBeVisible()

  await page.screenshot({
    path: `${reviewDir}/exercise-picker-redesign-390x844.png`,
    fullPage: true,
  })
})
