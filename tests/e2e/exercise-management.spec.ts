import { expect, test } from '@playwright/test'

test('manages an exercise family and exercise on a mobile device', async ({ page }) => {
  await page.goto('/exercises')

  await page.getByRole('link', { name: '创建第一个动作' }).click()
  await expect(page.getByRole('heading', { name: '新建动作' })).toBeVisible()

  await page.getByLabel('动作名称').fill('反向山羊挺身')
  await page.getByLabel('快速新建动作族').fill('反向山羊')
  await page.getByRole('button', { name: '新建并选择' }).click()
  await page.getByLabel('重量').selectOption('OPTIONAL')
  await page.getByLabel('自重 + 额外负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await expect(page.getByRole('heading', { name: '编辑动作' })).toBeVisible()
  await expect(page.getByLabel('动作名称')).toHaveValue('反向山羊挺身')
  await page.reload()
  await expect(page.getByLabel('动作名称')).toHaveValue('反向山羊挺身')

  await page.getByLabel('动作名称').fill('反向山羊挺身（器械）')
  await page.getByRole('button', { name: '保存动作' }).click()
  await page.getByRole('link', { name: '返回动作列表' }).click()
  await expect(page.getByText('反向山羊挺身（器械）')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '归档' }).click()
  await expect(page.getByText('反向山羊挺身（器械）')).not.toBeVisible()

  await page.getByRole('link', { name: '查看已归档动作' }).click()
  await page.getByRole('button', { name: '恢复' }).click()
  await expect(page.getByText('没有已归档动作。')).toBeVisible()
  await page.getByRole('link', { name: '返回动作列表' }).click()
  await expect(page.getByText('反向山羊挺身（器械）')).toBeVisible()
})
