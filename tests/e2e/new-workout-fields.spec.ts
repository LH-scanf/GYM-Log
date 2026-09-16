import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * 「新建训练」Sheet 的字段布局契约（2026-09-16 明确）。
 *
 * 日期 / 开始时间是短字段，**390 × 844（iPhone 12 主验收宽度）下必须两列**，
 * 不允许因为「窄屏」退化成两个占满整行的大输入框 —— 390 是主设计宽度，
 * 不是需要降级成单列的极窄屏。
 *
 * 同时锁定实现方式：值由应用紧凑渲染（`9月16日` / `13:44`），但控件本体必须
 * 仍然是原生 `input[type=date]` / `input[type=time]` 且可编辑 —— 点击入口必须
 * 仍然交给 iOS 原生选择器，不允许换成自定义日期选择器。
 */

const reviewDir = 'output/plan07r-review'
const viewports = [
  { label: '390x844', width: 390, height: 844 },
  { label: '430x932', width: 430, height: 932 },
]

async function openCreateSheet(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  const sheet = page.getByRole('dialog', { name: '新建训练' })
  await expect(sheet).toBeVisible()
  return sheet
}

for (const viewport of viewports) {
  test(`keeps the date and start time on one row at ${viewport.label}`, async ({
    page,
  }) => {
    mkdirSync(reviewDir, { recursive: true })
    const sheet = await openCreateSheet(page, viewport.width, viewport.height)

    // 两个控件必须在同一行、左右分明。单列堆叠时第二个控件会掉到下一行。
    const dateInput = sheet.getByLabel('日期')
    const timeInput = sheet.getByLabel('开始时间')
    const dateBox = await dateInput.boundingBox()
    const timeBox = await timeInput.boundingBox()
    expect(dateBox).not.toBeNull()
    expect(timeBox).not.toBeNull()
    expect(Math.abs(dateBox!.y - timeBox!.y)).toBeLessThanOrEqual(1)
    expect(timeBox!.x).toBeGreaterThanOrEqual(dateBox!.x + dateBox!.width)

    // 值也在同一行 —— 单列时第二个值会掉到下一行。
    const values = sheet.locator('.session-field__value')
    await expect(values).toHaveCount(2)
    const valueBoxes = await values.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect()
        return { x: Math.round(rect.x), y: Math.round(rect.y) }
      }),
    )
    expect(Math.abs(valueBoxes[0]!.y - valueBoxes[1]!.y)).toBeLessThanOrEqual(1)
    expect(valueBoxes[1]!.x).toBeGreaterThan(valueBoxes[0]!.x)

    // 紧凑值：当前年不带年份前缀、时间是 24 小时制。
    await expect(values.first()).toHaveText(/^\d{1,2}月\d{1,2}日$/)
    await expect(values.nth(1)).toHaveText(/^\d{1,2}:\d{2}$/)

    // 原生选择器入口仍然在：真的是 date / time 控件，可编辑，热区 >= 44px。
    await expect(sheet.locator('input[type="date"]')).toHaveCount(1)
    await expect(sheet.locator('input[type="time"]')).toHaveCount(1)
    for (const input of [dateInput, timeInput]) {
      await expect(input).toBeEditable()
      const box = await input.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThanOrEqual(80)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }

    await page.screenshot({
      path: `${reviewDir}/new-workout-fields-${viewport.label}.png`,
    })
  })
}

test('binds the compact value to the native input', async ({ page }) => {
  const sheet = await openCreateSheet(page, 390, 844)
  const values = sheet.locator('.session-field__value')

  await sheet.getByLabel('日期').fill('2026-09-11')
  await sheet.getByLabel('开始时间').fill('18:17')

  await expect(values.first()).toHaveText('9月11日')
  await expect(values.nth(1)).toHaveText('18:17')

  await sheet.getByRole('button', { name: '开始训练' }).click()
  await expect(page.getByText('9月11日 · 周五')).toBeVisible()
})
