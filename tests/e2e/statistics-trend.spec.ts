import { expect, test, type Page } from '@playwright/test'

const nav = (page: Page) => page.getByRole('navigation', { name: '主导航' })

async function createExternalExercise(page: Page, name: string) {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill(name)
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()
  // 保存成功会离开新建页（input 的 value 不是 text 节点，不能用 getByText 断言）。
  await expect(page).not.toHaveURL(/\/exercises\/new$/)
}

async function logWorkout(
  page: Page,
  date: string,
  entries: Array<{ name: string; load: string; reps: string }>,
) {
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByLabel('日期').fill(date)
  await page.getByLabel('开始时间').fill('18:00')
  await page.getByRole('button', { name: '开始训练' }).click()
  for (const entry of entries) {
    await page.getByRole('button', { name: '添加动作' }).click()
    const picker = page.getByRole('dialog', { name: '添加动作' })
    // Sheet 关闭动画期间旧的 .sheet 仍留在 DOM 里，用 CSS 类定位会命中两个同名按钮；
    // 按 role 定位只会看到仍然可见的对话框。同一个动作又会同时出现在「最近」和
    // 「未分组」两个分组里，所以再取 .first()。
    await picker.getByRole('button', { name: entry.name }).first().click()
    await expect(picker).toBeHidden()
    // 已保存的记录行也是「重量 / 次数」输入框，而新动作的 composer 永远排在
    // 页面最后 → 用 .last() 固定指向刚刚添加的那个 block。
    await page.getByLabel('重量').last().fill(entry.load)
    await page.getByLabel('次数').last().fill(entry.reps)
    await page.getByRole('button', { name: '保存这一组' }).last().click()
  }
  await page.getByLabel('结束时间').fill('19:00')
  await page.getByRole('button', { name: '完成训练' }).click()
}

test('trend card defaults to the most trained exercise and can switch', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await createExternalExercise(page, '趋势卧推')
  await createExternalExercise(page, '趋势深蹲')
  await nav(page).getByRole('link', { name: '训练' }).click()
  // 卧推练两次、深蹲一次 → 默认动作必须是卧推。
  await logWorkout(page, '2026-09-10', [{ name: '趋势卧推', load: '80', reps: '8' }])
  await logWorkout(page, '2026-09-12', [
    { name: '趋势卧推', load: '90', reps: '5' },
    { name: '趋势深蹲', load: '100', reps: '5' },
  ])

  await nav(page).getByRole('link', { name: '统计' }).click()
  await expect(page.getByRole('heading', { name: '统计', exact: true })).toBeVisible()

  // 左对齐大标题页头 + 年份胶囊。
  await expect(page.getByLabel('统计年份')).toHaveValue('2026')

  // 四张指标卡换成新文案，不再出现「2026 年训练次数」这种带年份的标签。
  await expect(page.locator('.metric-card')).toHaveCount(4)
  for (const label of ['今年训练次数', '今年训练时长', '本月训练次数', '本月训练时长']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }

  // 趋势卡：默认最常练动作，两个口径可互切。
  const picker = page.getByRole('button', { name: '选择要查看趋势的动作' })
  await expect(picker).toContainText('趋势卧推')
  await expect(page.getByRole('button', { name: '估算 1RM', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '最高重量', exact: true })).toBeVisible()
  await expect(page.locator('.trend-chart--compact svg')).toBeVisible()

  await picker.click()
  const sheet = page.getByRole('dialog', { name: '选择动作' })
  await expect(sheet).toBeVisible()
  await sheet.getByLabel('筛选动作').fill('深蹲')
  await sheet.getByRole('button', { name: '趋势深蹲', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect(picker).toContainText('趋势深蹲')

  // 月份刻度不能把「1月」折成两行——11px 的列宽装不下，标签需要横跨多列。
  const monthLabels = page.locator('.heatmap-months__label')
  expect(await monthLabels.count()).toBeGreaterThanOrEqual(12)
  const first = await monthLabels.first().boundingBox()
  expect(first).not.toBeNull()
  expect(first!.height).toBeLessThan(16)
})
