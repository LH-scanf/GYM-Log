import { expect, test } from '@playwright/test'

test('manages an exercise family and exercise on a mobile device', async ({ page }) => {
  await page.goto('/exercises')

  await page.getByRole('link', { name: '新建动作' }).click()
  await expect(page.getByRole('heading', { name: '新建动作' })).toBeVisible()

  await page.getByLabel('动作名称').fill('反向山羊挺身')
  // 新建时按名称自动推荐「身体部位」：infer 把「山羊」归成背（启发式建议，可能不准）
  await expect(page.getByLabel('身体部位')).toHaveValue('BACK')
  // 用户可以手动改成正式分类「核心」
  await page.getByLabel('身体部位').selectOption('CORE')
  await page.getByLabel('快速新建动作族').fill('反向山羊')
  await page.getByRole('button', { name: '新建并选择' }).click()
  await page.getByLabel('重量').selectOption('OPTIONAL')
  await page.getByLabel('自重 + 额外负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await expect(page).toHaveURL(/\/exercises$/)
  await expect(page.getByText('反向山羊挺身')).toBeVisible()
  await page.getByRole('link', { name: /反向山羊挺身/ }).click()
  await expect(page.getByRole('heading', { name: '动作详情' })).toBeVisible()
  await expect(page.getByText('核心')).toBeVisible()
  await page.getByRole('link', { name: '编辑' }).click()
  await expect(page).toHaveURL(/\/exercises\/[^/]+\/edit$/)
  await expect(page.getByRole('heading', { name: '编辑动作' })).toBeVisible()
  await expect(page.getByLabel('动作名称')).toHaveValue('反向山羊挺身')
  // 编辑时显示当前值（手动改的核心）
  await expect(page.getByLabel('身体部位')).toHaveValue('CORE')
  await page.reload()
  await expect(page.getByLabel('动作名称')).toHaveValue('反向山羊挺身')
  await expect(page.getByLabel('身体部位')).toHaveValue('CORE')

  await page.getByLabel('动作名称').fill('反向山羊挺身（器械）')
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises\/[^/]+$/)
  await page.getByRole('link', { name: '编辑' }).click()
  // 改名不得重置分类：仍是手动设的「核心」
  await expect(page.getByLabel('身体部位')).toHaveValue('CORE')
  await page.getByRole('link', { name: '返回动作详情' }).click()
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

  // 已归档列表通过二级管理入口进入，地址可以直接访问和刷新
  await page.getByRole('link', { name: '管理已归档动作' }).click()
  await expect(page).toHaveURL(/\/exercises\?view=archived$/)
  await page.reload()
  await expect(page.getByText('反向山羊挺身（器械）')).toBeVisible()

  const archivedRow = page.locator('.ex-row').filter({ hasText: '反向山羊挺身（器械）' })
  await archivedRow.getByRole('link').click()
  await expect(page.getByRole('heading', { name: '反向山羊挺身（器械）' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/exercises\?view=archived$/)
  await archivedRow.getByRole('button', { name: '反向山羊挺身（器械） 更多操作' }).click()
  await page
    .getByRole('dialog', { name: '反向山羊挺身（器械）' })
    .getByRole('button', { name: '恢复' })
    .click()
  await expect(page.getByText('没有已归档动作。')).toBeVisible()

  await page.getByRole('link', { name: '返回动作列表' }).click()
  await expect(page.getByText('反向山羊挺身（器械）')).toBeVisible()
})

test('keeps a failed new exercise on the form and finds a saved exercise in all', async ({
  page,
}) => {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('深蹲')
  await page.getByLabel('次数').selectOption('DISABLED')
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises\/new$/)
  await expect(page.getByLabel('动作名称')).toHaveValue('深蹲')
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('次数').selectOption('REQUIRED')
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises$/)
  await expect(
    page.getByRole('group', { name: '筛选动作' }).getByRole('button', { name: '全部' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('深蹲')).toBeVisible()
})

test('keeps the category rail inside mobile widths', async ({ page }) => {
  await page.goto('/exercises')
  const filters = page.getByRole('group', { name: '筛选动作' })
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(filters).toBeVisible()
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(width)
    expect(await filters.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
      await filters.evaluate((element) => element.clientWidth),
    )
  }
})
