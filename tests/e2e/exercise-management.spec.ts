import { expect, test } from '@playwright/test'

test('manages an exercise family and exercise on a mobile device', async ({ page }) => {
  await page.goto('/exercises')

  await page.getByRole('link', { name: '新建动作' }).click()
  await expect(page.getByRole('heading', { name: '新建动作' })).toBeVisible()

  await page.getByLabel('动作名称').fill('反向山羊挺身')
  // 新建时按名称自动推荐「身体部位」：infer 把「山羊」归成背（启发式建议，可能不准）
  await expect(page.getByLabel('身体部位')).toHaveValue('BACK')
  // 用户可以手动改成正式分类「腹/核心」
  await page.getByLabel('身体部位').selectOption('CORE')
  await page.getByLabel('快速新建动作族').fill('反向山羊')
  await page.getByRole('button', { name: '新建并选择' }).click()
  await page.getByLabel('重量').selectOption('OPTIONAL')
  await page.getByLabel('自重 + 额外负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await expect(page.getByRole('heading', { name: '编辑动作' })).toBeVisible()
  await expect(page.getByLabel('动作名称')).toHaveValue('反向山羊挺身')
  // 编辑时显示当前值（手动改的腹/核心）
  await expect(page.getByLabel('身体部位')).toHaveValue('CORE')
  await page.reload()
  await expect(page.getByLabel('动作名称')).toHaveValue('反向山羊挺身')
  await expect(page.getByLabel('身体部位')).toHaveValue('CORE')

  await page.getByLabel('动作名称').fill('反向山羊挺身（器械）')
  await page.getByRole('button', { name: '保存动作' }).click()
  // 改名不得重置分类：仍是手动设的「腹/核心」
  await expect(page.getByLabel('身体部位')).toHaveValue('CORE')
  await page.getByRole('link', { name: '返回动作列表' }).click()
  await expect(page.getByText('反向山羊挺身（器械）')).toBeVisible()

  // 归档入口在行内的「更多操作」菜单里
  const row = page.locator('.ex-row').filter({ hasText: '反向山羊挺身（器械）' })
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: '反向山羊挺身（器械） 更多操作' }).click()
  await page
    .getByRole('dialog', { name: '反向山羊挺身（器械）' })
    .getByRole('button', { name: '归档' })
    .click()
  await expect(page.getByText('反向山羊挺身（器械）')).not.toBeVisible()

  // 已归档列表通过筛选 chips 进入
  await page
    .getByRole('group', { name: '筛选动作' })
    .getByRole('button', { name: '已归档' })
    .click()
  await expect(page.getByText('反向山羊挺身（器械）')).toBeVisible()

  const archivedRow = page.locator('.ex-row').filter({ hasText: '反向山羊挺身（器械）' })
  await archivedRow.getByRole('button', { name: '反向山羊挺身（器械） 更多操作' }).click()
  await page
    .getByRole('dialog', { name: '反向山羊挺身（器械）' })
    .getByRole('button', { name: '恢复' })
    .click()
  await expect(page.getByText('没有已归档动作。')).toBeVisible()

  await page
    .getByRole('group', { name: '筛选动作' })
    .getByRole('button', { name: '全部' })
    .click()
  await expect(page.getByText('反向山羊挺身（器械）')).toBeVisible()
})
