import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const reviewDir = 'output/plan07r-review'
// 390×844 (iPhone 12) is the primary acceptance viewport; the Record Row pixel
// contract is defined there. 430×932 only has to stay fluid and not break.
const viewports = [
  { label: '390x844', width: 390, height: 844, primary: true },
  { label: '430x932', width: 430, height: 932, primary: false },
]

for (const viewport of viewports) {
  test(`active workout page at ${viewport.label}`, async ({ page }) => {
    mkdirSync(reviewDir, { recursive: true })
    await page.setViewportSize(viewport)

    await page.goto('/exercises/new')
    await page.getByLabel('动作名称').fill(`训练记录卧推-${viewport.width}`)
    await page.getByLabel('重量').selectOption('REQUIRED')
    await page.getByLabel('普通负重').check()
    await page.getByRole('button', { name: '保存动作' }).click()

    await page.goto('/')
    await page.getByRole('button', { name: '新建训练' }).click()
    await page.getByRole('button', { name: '开始训练' }).click()

    await expect(page.getByRole('navigation', { name: '主导航' })).toBeHidden()
    await expect(page.locator('.home-header')).toHaveCount(0)
    await expect(page.locator('input[type="date"]')).toHaveCount(0)

    const endTime = page.getByLabel('结束时间')
    await expect(endTime).toHaveValue('')
    await expect(page.locator('.session-field__value').first()).toHaveText(
      /^\d{2}:\d{2}$/,
    )
    await expect(page.locator('.session-field__value').nth(1)).toHaveText('—')
    await expect(page.locator('.session-badge')).toHaveText('进行中')

    const viewportHeight = await page.evaluate(() => window.innerHeight)
    const bar = await page.locator('.sticky-actions').boundingBox()
    expect(bar).not.toBeNull()
    expect(Math.round(bar!.y + bar!.height)).toBe(viewportHeight)

    const headerBox = await page.locator('.session-header').boundingBox()
    expect(headerBox).not.toBeNull()
    expect(headerBox!.height).toBeLessThanOrEqual(124)

    const hasBodyOverflow = () =>
      page.locator('body').evaluate((body) => body.scrollWidth > window.innerWidth)
    expect(await hasBodyOverflow()).toBe(false)

    await page.screenshot({
      path: `${reviewDir}/active-workout-${viewport.label}.png`,
    })

    await page.getByRole('button', { name: '添加动作' }).click()
    await page
      .locator('.sheet')
      .getByRole('button', { name: new RegExp(`训练记录卧推-${viewport.width}`) })
      .first()
      .click()
    await expect(page.locator('.exercise-group')).toHaveCount(1)

    const previousBox = await page.locator('.exercise-card__previous').boundingBox()
    const moreBox = await page.locator('.exercise-card__more .icon-button').boundingBox()
    expect(previousBox).not.toBeNull()
    expect(moreBox).not.toBeNull()
    const previousCenter = previousBox!.y + previousBox!.height / 2
    const moreCenter = moreBox!.y + moreBox!.height / 2
    expect(Math.abs(previousCenter - moreCenter)).toBeLessThanOrEqual(4)

    await page.getByLabel('重量').fill('40')
    await page.getByLabel('次数').fill('8')
    await page.getByRole('button', { name: '保存这一组' }).click()
    await expect(page.getByLabel('重量')).toHaveValue('40')

    const deleteHit = await page.locator('.record-delete').boundingBox()
    expect(deleteHit).not.toBeNull()
    expect(deleteHit!.width).toBeGreaterThanOrEqual(44)
    expect(deleteHit!.height).toBeGreaterThanOrEqual(44)

    const listBox = await page.locator('.record-list').boundingBox()
    const tableHeadBox = await page.locator('.exercise-card__table-head').boundingBox()
    expect(listBox).not.toBeNull()
    expect(tableHeadBox).not.toBeNull()

    // Record Row density contract: 46–50px row, 40–44px field, 112–120px wide.
    const rowBox = await page.locator('.record-row').first().boundingBox()
    const fieldBox = await page.locator('.record-field').first().boundingBox()
    const valueBox = await page.locator('.record-row__input').first().boundingBox()
    const unitBox = await page.locator('.record-field__unit').first().boundingBox()
    expect(rowBox).not.toBeNull()
    expect(fieldBox).not.toBeNull()
    expect(valueBox).not.toBeNull()
    expect(unitBox).not.toBeNull()
    expect(rowBox!.height).toBeGreaterThanOrEqual(46)
    expect(rowBox!.height).toBeLessThanOrEqual(50)
    expect(fieldBox!.height).toBeGreaterThanOrEqual(40)
    expect(fieldBox!.height).toBeLessThanOrEqual(44)
    if (viewport.primary) {
      expect(fieldBox!.width).toBeGreaterThanOrEqual(112)
      expect(fieldBox!.width).toBeLessThanOrEqual(120)
    } else {
      // Wider screen: the field stays fluid and must still leave room for the
      // index, the ×, and the delete hit area inside the row.
      expect(fieldBox!.width).toBeGreaterThanOrEqual(112)
      expect(fieldBox!.width * 2).toBeLessThanOrEqual(rowBox!.width - 84)
    }

    // The value and its unit must read as one tight token, not two loose parts.
    const tokenGap = unitBox!.x - (valueBox!.x + valueBox!.width)
    expect(tokenGap).toBeGreaterThanOrEqual(0)
    expect(tokenGap).toBeLessThanOrEqual(8)
    expect(fieldBox!.x).toBeLessThanOrEqual(valueBox!.x)

    const typography = await page.evaluate(() => {
      const style = (selector: string) => {
        const el = document.querySelector(selector)
        if (!el) return null
        const computed = getComputedStyle(el)
        return {
          fontSize: Number.parseFloat(computed.fontSize),
          fontWeight: computed.fontWeight,
          textAlign: computed.textAlign,
        }
      }
      return {
        value: style('.record-row__input'),
        unit: style('.record-field__unit'),
        head: style('.exercise-card__table-head'),
      }
    })
    expect(typography.value!.fontSize).toBeGreaterThanOrEqual(18)
    expect(typography.value!.fontSize).toBeLessThanOrEqual(20)
    expect(typography.value!.fontWeight).toBe('500')
    expect(typography.value!.textAlign).toBe('right')
    expect(typography.unit!.fontSize).toBeGreaterThanOrEqual(13)
    expect(typography.unit!.fontSize).toBeLessThanOrEqual(14)
    expect(typography.head!.fontSize).toBeGreaterThanOrEqual(13)
    expect(typography.head!.fontSize).toBeLessThanOrEqual(14)

    expect(await hasBodyOverflow()).toBe(false)

    await page.screenshot({
      path: `${reviewDir}/active-workout-record-${viewport.label}.png`,
    })

    // Density check with a realistic 4-set exercise.
    for (let index = 0; index < 3; index += 1) {
      await page.getByRole('button', { name: '+ 添加一组' }).click()
    }
    await expect(page.locator('.record-row')).toHaveCount(4)

    const pitches = await page
      .locator('.record-row')
      .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().y))
    const pitch = pitches[1] - pitches[0]
    expect(pitch).toBeGreaterThanOrEqual(46)
    expect(pitch).toBeLessThanOrEqual(50)

    await page.screenshot({
      path: `${reviewDir}/active-workout-sets-${viewport.label}.png`,
    })

    await page.getByRole('button', { name: '完成训练' }).click()
    await expect(page.getByRole('alert')).toContainText('结束时间')
    await expect(endTime).toHaveValue('')
    await expect(page.locator('.exercise-group')).toHaveCount(1)

    await page.getByRole('button', { name: '填入当前时间' }).click()
    await expect(endTime).not.toHaveValue('')
    await page.getByRole('button', { name: '完成训练' }).click()
    await expect(page.getByRole('button', { name: '新建训练' })).toBeVisible()
  })
}
