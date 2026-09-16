import { expect, test, type Page } from '@playwright/test'

/**
 * 警告的生命周期：字段不合法时出现，用户一动手编辑相关字段就必须消失。
 * 真机上的问题是「先填写这一组所需字段。」在值已经填好之后仍然挂着 ——
 * 那是一个块级状态，之前从来没有被编辑动作清掉。
 */

async function startWorkoutWithBench(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('卧推')
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name: '卧推' }).click()

  return page.locator('.exercise-group').filter({ hasText: '卧推' })
}

test('keeps a warning while the field is invalid and drops it once fixed', async ({
  page,
}) => {
  const block = await startWorkoutWithBench(page)
  const alert = block.getByRole('alert')

  // 1) 块级警告：记录为空时按「+ 添加一组」
  await block.getByRole('button', { name: '+ 添加一组' }).click()
  await expect(alert).toContainText('先填写这一组所需字段')

  // 用户开始填写 → 警告必须立刻消失（真机 bug 就在这里）
  await block.getByLabel('重量').fill('40')
  await expect(alert).toHaveCount(0)

  // 重新触发一次，再验证「清空字段」也算编辑
  await block.getByRole('button', { name: '+ 添加一组' }).click()
  await expect(alert).toContainText('先填写这一组所需字段')
  await block.getByLabel('重量').fill('')
  await expect(alert).toHaveCount(0)

  // 2) 草稿行警告：必填项没填就保存
  await block.getByLabel('重量').fill('40')
  await expect(alert).toHaveCount(0)
  await block.getByRole('button', { name: '保存这一组' }).click()
  await expect(alert).toContainText('次数')

  await block.getByLabel('次数').fill('8')
  await expect(alert).toHaveCount(0)

  await block.getByRole('button', { name: '保存这一组' }).click()
  await expect(alert).toHaveCount(0)
  await expect(block.locator('.record-row')).toHaveCount(1)

  // 3) 已保存的记录行：清空必填项并失焦 → 警告；重新填好 → 消失
  const load = block.getByLabel('重量')
  await load.fill('')
  await block.getByLabel('次数').click()
  await expect(alert).toContainText('重量')

  await load.fill('42.5')
  await expect(alert).toHaveCount(0)
  await block.getByLabel('次数').click()
  await expect(alert).toHaveCount(0)
  await expect(load).toHaveValue('42.5')
})
