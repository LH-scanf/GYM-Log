import { expect, test } from '@playwright/test'

test('records, restores, edits and completes a mobile workout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('卧推')
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await page.getByRole('link', { name: '训练' }).click()
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByLabel('日期').fill('2026-09-11')
  await page.getByLabel('开始时间').fill('18:17')
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name: '卧推' }).click()
  await page.getByLabel('重量').fill('40')
  await page.getByLabel('次数').fill('8')
  await page.getByRole('button', { name: '保存这一组' }).click()
  await expect(page.getByLabel('重量')).toHaveValue('40')
  await page.getByRole('button', { name: '+ 添加一组' }).click()
  await page.reload()
  await page.getByRole('button', { name: '继续未完成训练' }).click()
  await expect(page.getByLabel('重量')).toHaveCount(2)
  await page.getByLabel('结束时间').fill('19:15')
  await page.getByRole('button', { name: '完成训练' }).click()
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()

  await page.getByRole('link', { name: '9月11日 周五' }).click()
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()

  // 历史训练的「编辑」直接改写真实数据（日期 / 开始 / 结束），
  // 而且复用与进行中训练同一套 WorkoutEditor，不再是另一套排序 UI。
  await page.getByRole('button', { name: '编辑' }).click()
  await expect(page.getByRole('heading', { name: '编辑训练' })).toBeVisible()
  await expect(page.getByRole('button', { name: '上移' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '动作上移' })).toHaveCount(0)

  await page.getByLabel('训练日期').fill('2026-09-12')
  await page.getByLabel('开始时间').fill('18:20')
  await page.getByLabel('结束时间').fill('19:20')
  await page.getByRole('button', { name: '保存修改' }).click()

  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible()
  await expect(page.locator('.session-header__date')).toHaveText('2026-09-12')
  const fields = page.locator('.session-header__grid .session-field')
  await expect(fields.nth(0).locator('.session-field__value')).toHaveText('18:20')
  await expect(fields.nth(1).locator('.session-field__value')).toHaveText('19:20')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除本次训练' }).click()
  await expect(page.getByText('暂无训练记录')).toBeVisible()
})
