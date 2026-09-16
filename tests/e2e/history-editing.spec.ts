import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * 历史训练的「编辑」不再是一套独立的排序 UI（上移 / 下移 / 动作上移 / 动作下移），
 * 而是复用进行中训练的 WorkoutEditor + ExerciseBlockEditor，直接改真实数据：
 * 加一组 / 删一组 / 加动作 / 删动作。
 */

const reviewDir = 'output/plan07r-review'

async function createExercise(page: Page, name: string) {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill(name)
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises\/[^/]+$/)
}

test('edits a historical workout through the shared record components', async ({
  page,
}) => {
  mkdirSync(reviewDir, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await createExercise(page, '卧推')
  await createExercise(page, '高位下拉')

  // 先记录一次含两组的训练
  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name: '卧推' }).click()

  const bench = page.locator('.exercise-group').filter({ hasText: '卧推' })
  await bench.getByLabel('重量').fill('40')
  await bench.getByLabel('次数').fill('8')
  await bench.getByRole('button', { name: '保存这一组' }).click()
  await expect(bench.locator('.record-row')).toHaveCount(1)
  await bench.getByRole('button', { name: '+ 添加一组' }).click()
  await expect(bench.locator('.record-row')).toHaveCount(2)

  await page.getByLabel('结束时间').fill('19:00')
  await page.getByRole('button', { name: '完成训练' }).click()
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()

  await page.locator('.workout-card').first().click()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()

  // 只读视图：两组都是静态文本，没有任何输入控件，也没有排序按钮
  await expect(page.locator('.record-row')).toHaveCount(2)
  await expect(page.locator('.record-row').first()).toContainText('40kg')
  await expect(page.locator('.exercise-group input')).toHaveCount(0)
  for (const label of ['上移', '下移', '动作上移', '动作下移']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0)
  }
  await expect(page.locator('body')).not.toContainText('上移')
  await expect(page.locator('body')).not.toContainText('下移')
  await page.screenshot({ path: `${reviewDir}/workout-detail-390x844.png` })

  // 进入编辑：与进行中训练完全相同的组件
  await page.getByRole('button', { name: '编辑' }).click()
  await expect(page.getByRole('heading', { name: '编辑训练' })).toBeVisible()
  await expect(page.getByRole('button', { name: '保存修改' })).toBeVisible()
  await page.screenshot({ path: `${reviewDir}/workout-history-edit-390x844.png` })

  // 删掉第二组
  await page.getByRole('button', { name: '删除第 2 条记录' }).click()
  await expect(bench.locator('.record-row')).toHaveCount(1)

  // 再加一组（沿用上一组的数值）
  await bench.getByRole('button', { name: '+ 添加一组' }).click()
  await expect(bench.locator('.record-row')).toHaveCount(2)

  // 加一个动作
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name: '高位下拉' }).click()
  await expect(page.locator('.exercise-group')).toHaveCount(2)

  // 再把它删掉
  const lat = page.locator('.exercise-group').filter({ hasText: '高位下拉' })
  await lat.getByRole('button', { name: '更多 高位下拉 操作' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await lat.getByRole('button', { name: '删除动作' }).click()
  await expect(page.locator('.exercise-group')).toHaveCount(1)

  // 保存并回到只读详情
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()
  await expect(page.locator('.exercise-group')).toHaveCount(1)
  await expect(page.locator('.record-row')).toHaveCount(2)

  // 改动确实落库
  await page.reload()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()
  await expect(page.locator('.exercise-group')).toHaveCount(1)
  await expect(page.locator('.record-row')).toHaveCount(2)
})
