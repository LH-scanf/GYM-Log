import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * 真机（iPhone 12）上「新建训练」Sheet 可以被左右拖动 —— 这不是抖动，
 * 是页面确实产生了横向溢出。根因是 flex/grid 子项默认的 `min-width: auto`
 * 让日期/时间输入的固有最小宽度顶宽了轨道。修复方式是逐层 `min-width: 0`
 * + `minmax(0, 1fr)` + `.sheet { max-width: 100% }`，而不是 `overflow-x: hidden`。
 *
 * 这里锁定修复结果，并额外用一个「把字段撑大」的压力用例覆盖同一条链路，
 * 防止以后有人把 `min-width: 0` 删掉又不自知。
 *
 * 2026-09-16 起日期 / 开始时间改为「紧凑值 + 透明原生控件」的短字段
 * （见 `tests/e2e/new-workout-fields.spec.ts`）：值的固有宽度仍然会顶宽轨道，
 * 所以压力用例改成放大 `.session-field__value`，链路与原来完全一致。
 */

const reviewDir = 'output/plan07r-review'
const viewports = [
  { label: '390x844', width: 390, height: 844 },
  { label: '430x932', width: 430, height: 932 },
]

async function horizontalMetrics(page: Page) {
  return page.evaluate(() => ({
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }))
}

/** 断言页面本身不出现横向滚动，且 Sheet 不越过视口左右边界、内部也不横向滚动。 */
async function expectNoHorizontalOverflow(page: Page, sheetSelector: string) {
  const metrics = await horizontalMetrics(page)
  expect(metrics.documentScrollWidth).toBe(metrics.viewportWidth)
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth)

  const sheet = page.locator(sheetSelector)
  const box = await sheet.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(-0.5)
  expect(Math.round(box!.x + box!.width)).toBeLessThanOrEqual(metrics.viewportWidth)

  const inner = await sheet.evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
  }))
  expect(inner.scrollWidth).toBeLessThanOrEqual(inner.clientWidth)
}

/** 每个可见控件都必须完整落在 Sheet 的左右边界内。 */
async function expectChildrenInsideSheet(page: Page, sheetSelector: string) {
  const escapes = await page.evaluate((selector) => {
    const sheet = document.querySelector(selector)
    if (sheet === null) return ['找不到 Sheet']
    const bounds = sheet.getBoundingClientRect()
    return [...sheet.querySelectorAll('input, select, textarea, button, label')]
      .map((node) => {
        const box = node.getBoundingClientRect()
        return {
          name: node.getAttribute('aria-label') ?? node.tagName,
          left: box.left,
          right: box.right,
          width: box.width,
        }
      })
      .filter(
        (item) =>
          item.width > 0 &&
          (item.left < bounds.left - 0.5 || item.right > bounds.right + 0.5),
      )
      .map(
        (item) =>
          `${item.name} 越界（${Math.round(item.left)} → ${Math.round(item.right)}，Sheet ${Math.round(bounds.left)} → ${Math.round(bounds.right)}）`,
      )
  }, sheetSelector)
  expect(escapes).toEqual([])
}

for (const viewport of viewports) {
  test(`keeps the New Workout Sheet inside ${viewport.label}`, async ({ page }) => {
    mkdirSync(reviewDir, { recursive: true })
    await page.setViewportSize(viewport)
    await page.goto('/')

    await page.getByRole('button', { name: '新建训练' }).click()
    const sheet = page.getByRole('dialog', { name: '新建训练' })
    await expect(sheet).toBeVisible()

    await expectNoHorizontalOverflow(page, '.sheet')
    await expectChildrenInsideSheet(page, '.sheet')

    // 日期与时间控件必须仍然可用 —— 修复不能靠把它们裁掉实现。
    const dateInput = sheet.getByLabel('日期')
    const timeInput = sheet.getByLabel('开始时间')
    await expect(dateInput).toBeVisible()
    await expect(timeInput).toBeVisible()
    await expect(dateInput).not.toHaveValue('')
    await expect(timeInput).not.toHaveValue('')
    for (const input of [dateInput, timeInput]) {
      const box = await input.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThanOrEqual(80)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }

    await page.screenshot({ path: `${reviewDir}/sheet-overflow-${viewport.label}.png` })
  })
}

test('keeps the exercise picker sheet inside 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('坐姿划船')
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await expect(page.getByRole('dialog', { name: '添加动作' })).toBeVisible()

  await expectNoHorizontalOverflow(page, '.sheet')
  await expectChildrenInsideSheet(page, '.sheet')
})

test('stays inside the viewport when the sheet fields grow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  // 复现真机失守的那条链路：把字段里文本的固有最小宽度顶到远超轨道宽度。
  // `.session-field__control .session-field__value` 上的 `overflow: hidden`
  // 会让这个 flex 项的 `min-width: auto` 归零，值才能收缩；去掉它这里就会溢出。
  await page.addStyleTag({
    content: '.sheet .session-field__value { font-size: 80px; }',
  })
  await page.getByRole('button', { name: '新建训练' }).click()
  await expect(page.getByRole('dialog', { name: '新建训练' })).toBeVisible()

  await expectNoHorizontalOverflow(page, '.sheet')
  await expectChildrenInsideSheet(page, '.sheet')
})
