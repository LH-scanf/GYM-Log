import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Acceptance scenario for the Exercise Card density work: one exercise with four
// real sets (40×8, 40×8, 45×6, 45×5) captured on the iPhone 12 first screen.
// The numbers below are the design contract for Record Row / Exercise Card.
const reviewDir = 'output/plan07r-review'
const sets = [
  { load: '40', reps: '8' },
  { load: '40', reps: '8' },
  { load: '45', reps: '6' },
  { load: '45', reps: '5' },
]

const contract = {
  fieldHeight: [34, 36],
  rowPitch: [44, 46],
  fieldWidth: [96, 106],
  addHeight: [34, 38],
  valueFontSize: [16, 17],
  unitFontSize: [12, 13],
  headFontSize: [12, 13],
} as const

const inRange = (value: number, [min, max]: readonly [number, number]) =>
  value >= min && value <= max

async function buildFourSetExercise(page: import('@playwright/test').Page) {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('卧推')
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()

  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByRole('button', { name: '开始训练' }).click()
  await page.getByRole('button', { name: '添加动作' }).click()
  await page.locator('.sheet').getByRole('button', { name: '卧推' }).first().click()

  await page.getByLabel('重量').fill(sets[0].load)
  await page.getByLabel('次数').fill(sets[0].reps)
  await page.getByRole('button', { name: '保存这一组' }).click()

  for (const set of sets.slice(1)) {
    const before = await page.locator('.record-row').count()
    await page.getByRole('button', { name: '+ 添加一组' }).click()
    // The copied row is written asynchronously; wait for it before typing.
    await expect(page.locator('.record-row')).toHaveCount(before + 1)
    const load = page.getByLabel('重量').last()
    const reps = page.getByLabel('次数').last()
    await load.fill(set.load)
    await reps.fill(set.reps)
    await reps.blur()
    await expect(load).toHaveValue(set.load)
    await expect(reps).toHaveValue(set.reps)
  }

  await expect(page.locator('.record-row')).toHaveCount(sets.length)
  const values = await page
    .locator('.record-row')
    .evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('input')).map((input) => input.value),
      ),
    )
  expect(values).toEqual(sets.map((set) => [set.load, set.reps]))
  await page.evaluate(() => window.scrollTo(0, 0))
}

test.describe('Record Row density on iPhone 12', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })

  test('keeps the exercise card as dense as the reference', async ({ page }) => {
    mkdirSync(reviewDir, { recursive: true })
    await buildFourSetExercise(page)

    await page.screenshot({ path: `${reviewDir}/record-row-390x844.png` })

    const metrics = await page.evaluate(() => {
      const rect = (el: Element) => el.getBoundingClientRect()
      const style = (el: Element) => getComputedStyle(el)
      const rows = Array.from(document.querySelectorAll('.record-row'))
      const fields = rows[0].querySelectorAll('.record-field')
      const head = document.querySelector('.exercise-card__table-head')!
      const add = document.querySelector('.exercise-card__add')!
      const value = rows[0].querySelector('.record-row__input')!
      return {
        rowHeight: rect(rows[0]).height,
        pitch: rect(rows[1]).y - rect(rows[0]).y,
        fieldHeight: rect(fields[0]).height,
        loadWidth: rect(fields[0]).width,
        repsWidth: rect(fields[1]).width,
        addHeight: rect(add).height,
        headFontSize: Number.parseFloat(style(head).fontSize),
        valueFontSize: Number.parseFloat(style(value).fontSize),
        valueFontWeight: style(value).fontWeight,
        unitFontSize: Number.parseFloat(
          style(rows[0].querySelector('.record-field__unit')!).fontSize,
        ),
        bodyOverflow: document.body.scrollWidth > window.innerWidth,
      }
    })
    console.log('record-row metrics', JSON.stringify(metrics))

    expect(inRange(metrics.fieldHeight, contract.fieldHeight)).toBe(true)
    expect(inRange(metrics.pitch, contract.rowPitch)).toBe(true)
    expect(inRange(metrics.loadWidth, contract.fieldWidth)).toBe(true)
    expect(inRange(metrics.repsWidth, contract.fieldWidth)).toBe(true)
    expect(inRange(metrics.addHeight, contract.addHeight)).toBe(true)
    expect(inRange(metrics.valueFontSize, contract.valueFontSize)).toBe(true)
    expect(inRange(metrics.unitFontSize, contract.unitFontSize)).toBe(true)
    expect(inRange(metrics.headFontSize, contract.headFontSize)).toBe(true)
    expect(metrics.valueFontWeight).toBe('500')
    expect(metrics.bodyOverflow).toBe(false)
  })
})

test.describe('Record Row density on a wider screen', () => {
  test.use({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 })

  test('stays fluid without breaking', async ({ page }) => {
    mkdirSync(reviewDir, { recursive: true })
    await buildFourSetExercise(page)
    await page.screenshot({ path: `${reviewDir}/record-row-430x932.png` })

    const layout = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.record-row'))
      const row = rows[0].getBoundingClientRect()
      const fields = Array.from(rows[0].querySelectorAll('.record-field'))
      const first = fields[0].getBoundingClientRect()
      const second = fields[1].getBoundingClientRect()
      const del = rows[0].querySelector('.record-delete')!.getBoundingClientRect()
      const pitch = rows[1].getBoundingClientRect().y - row.y
      return {
        fieldHeight: first.height,
        pitch,
        gapBetweenFields: second.x - (first.x + first.width),
        trailingGap: row.x + row.width - (del.x + del.width),
        bodyOverflow: document.body.scrollWidth > window.innerWidth,
      }
    })
    console.log('record-row 430 metrics', JSON.stringify(layout))

    expect(layout.bodyOverflow).toBe(false)
    expect(inRange(layout.fieldHeight, contract.fieldHeight)).toBe(true)
    expect(inRange(layout.pitch, contract.rowPitch)).toBe(true)
    expect(layout.gapBetweenFields).toBeGreaterThanOrEqual(24)
    expect(layout.trailingGap).toBeGreaterThanOrEqual(0)
  })
})
