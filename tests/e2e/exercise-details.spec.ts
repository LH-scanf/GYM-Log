import { expect, test, type Page } from '@playwright/test'

function isoShift(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

async function createExercise(
  page: Page,
  name: string,
  mode: 'external' | 'bodyweight' | 'assistance' | 'reps' | 'cardio',
): Promise<string> {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill(name)
  if (mode === 'cardio') {
    await page.getByLabel('次数').selectOption('DISABLED')
    await page.getByLabel('时间').selectOption('REQUIRED')
    await page.getByLabel('速度').selectOption('OPTIONAL')
    await page.getByLabel('坡度').selectOption('OPTIONAL')
  } else if (mode !== 'reps') {
    await page
      .getByLabel('重量')
      .selectOption(mode === 'bodyweight' ? 'OPTIONAL' : 'REQUIRED')
    const label =
      mode === 'external'
        ? '普通负重'
        : mode === 'bodyweight'
          ? '自重 + 额外负重'
          : '辅助重量'
    await page.getByLabel(label).check()
  }
  await page.getByRole('button', { name: '保存动作' }).click()
  await expect(page).toHaveURL(/\/exercises$/)
  const href = await page
    .locator('.ex-row')
    .filter({ hasText: name })
    .getByRole('link')
    .getAttribute('href')
  expect(href).not.toBeNull()
  return href!
}

async function startWorkout(page: Page, date: string) {
  await page.goto('/')
  await page.getByRole('button', { name: '新建训练' }).click()
  await page.getByLabel('日期').fill(date)
  await page.getByLabel('开始时间').fill('18:00')
  await page.getByRole('button', { name: '开始训练' }).click()
}

async function addExercise(page: Page, name: string) {
  await page.getByRole('button', { name: '添加动作' }).click()
  await page
    .getByRole('dialog', { name: '添加动作' })
    .getByRole('button', { name })
    .first()
    .click()
  return page.locator('.exercise-group').filter({ hasText: name }).last()
}

async function finishWorkout(page: Page) {
  await page.getByLabel('结束时间').fill('19:00')
  await page.getByRole('button', { name: '完成训练' }).click()
}

test('shows external strength trends by real dates and keeps the legacy link', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const path = await createExercise(page, '杠铃卧推', 'external')
  for (const [shift, load, reps] of [
    [-35, '60', '8'],
    [-10, '80', '6'],
    [-2, '100', '5'],
  ] as const) {
    await startWorkout(page, isoShift(shift))
    const block = await addExercise(page, '杠铃卧推')
    await block.getByLabel('重量').fill(load)
    await block.getByLabel('次数').fill(reps)
    await block.getByRole('button', { name: '保存这一组' }).click()
    await finishWorkout(page)
  }

  await page.goto('/exercises')
  await page.locator('.ex-row').filter({ hasText: '杠铃卧推' }).getByRole('link').click()
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await expect(page.getByRole('heading', { name: '杠铃卧推' })).toBeVisible()
  await expect(page.getByText('胸', { exact: true })).toBeVisible()
  await expect(page.getByText('100 kg × 5 次')).toBeVisible()
  await expect(page.getByText('116.7 kg')).toBeVisible()
  await expect(
    page.getByRole('group', { name: '时间范围' }).getByRole('button', { name: '月' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('group', { name: '趋势指标' }).getByRole('button', { name: '重量' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('group', { name: '趋势日期' }).getByRole('button'),
  ).toHaveCount(2)

  await page
    .getByRole('group', { name: '趋势指标' })
    .getByRole('button', { name: '估算 1RM' })
    .click()
  await expect(page.getByRole('status').last()).toContainText('116.7 kg')
  await page
    .getByRole('group', { name: '时间范围' })
    .getByRole('button', { name: '周' })
    .click()
  await expect(
    page.getByRole('group', { name: '趋势日期' }).getByRole('button'),
  ).toHaveCount(1)
  await page
    .getByRole('group', { name: '时间范围' })
    .getByRole('button', { name: '全部' })
    .click()
  const dateButtons = page.getByRole('group', { name: '趋势日期' }).getByRole('button')
  await expect(dateButtons).toHaveCount(3)
  await dateButtons.first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').last()).toContainText(isoShift(-35))
  expect((await dateButtons.first().boundingBox())!.height).toBeGreaterThanOrEqual(44)
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(width)
    await expect(dateButtons.first()).toBeVisible()
  }

  const id = path.split('/').at(-1)
  await page.goto('/exercises')
  await page.goto(`/statistics/exercises/${id}`)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await page.reload()
  await expect(page.getByRole('heading', { name: '杠铃卧推' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/exercises$/)
})

test('adapts the overview and trend metrics to four record types', async ({ page }) => {
  const paths = {
    bodyweight: await createExercise(page, '反向山羊挺身', 'bodyweight'),
    assistance: await createExercise(page, '辅助引体向上', 'assistance'),
    reps: await createExercise(page, '卷腹', 'reps'),
    cardio: await createExercise(page, '爬坡', 'cardio'),
  }
  await startWorkout(page, isoShift(0))

  const bodyweight = await addExercise(page, '反向山羊挺身')
  await bodyweight.getByLabel('重量').fill('5')
  await bodyweight.getByLabel('次数').fill('10')
  await bodyweight.getByRole('button', { name: '保存这一组' }).click()

  const assistance = await addExercise(page, '辅助引体向上')
  await assistance.getByLabel('重量').fill('45')
  await assistance.getByLabel('次数').fill('6')
  await assistance.getByRole('button', { name: '保存这一组' }).click()

  const reps = await addExercise(page, '卷腹')
  await reps.getByLabel('次数').fill('25')
  await reps.getByRole('button', { name: '保存这一组' }).click()

  const cardio = await addExercise(page, '爬坡')
  await cardio.getByLabel('时间').fill('40')
  await cardio.getByLabel('速度').fill('5')
  await cardio.getByLabel('坡度').fill('12')
  await cardio.getByRole('button', { name: '保存这一组' }).click()
  await finishWorkout(page)

  await page.goto(paths.bodyweight)
  const overview = page.getByRole('region', { name: '动作训练概览' })
  await expect(overview.getByText('最大额外负重')).toBeVisible()
  await expect(overview.getByText('自重最佳次数')).toBeVisible()
  await expect(overview.getByText('5 kg')).toBeVisible()
  await expect(overview.getByText('—')).toBeVisible()
  await expect(page.getByRole('button', { name: '估算 1RM' })).toHaveCount(0)

  await page.goto(paths.assistance)
  await expect(page.getByText('最小辅助重量')).toBeVisible()
  await expect(page.getByText('辅助重量下降通常表示进步。')).toBeVisible()
  await expect(overview.getByText('45 kg')).toBeVisible()
  await expect(page.getByRole('button', { name: '估算 1RM' })).toHaveCount(0)

  await page.goto(paths.reps)
  await expect(page.getByText('单组最高次数')).toBeVisible()
  await expect(overview.getByText('25 次')).toBeVisible()
  await expect(page.getByRole('button', { name: '估算 1RM' })).toHaveCount(0)

  await page.goto(paths.cardio)
  await expect(page.getByText('累计时长')).toBeVisible()
  await expect(overview.getByText('40 分钟')).toBeVisible()
  await expect(page.getByRole('heading', { name: '训练趋势' })).toBeVisible()
  await expect(
    page.getByRole('group', { name: '趋势指标' }).getByRole('button', { name: '时长' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '估算 1RM' })).toHaveCount(0)
})

test('keeps archived exercise details and handles an unknown id', async ({ page }) => {
  const path = await createExercise(page, '杠铃划船', 'external')
  const row = page.locator('.ex-row').filter({ hasText: '杠铃划船' })
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: '杠铃划船 更多操作' }).click()
  await page
    .getByRole('dialog', { name: '杠铃划船' })
    .getByRole('button', { name: '归档' })
    .click()
  await page.goto(`/statistics/exercises/${path.split('/').at(-1)}`)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await expect(page.getByText('已归档')).toBeVisible()
  await expect(page.getByText('还没有这个动作的训练记录。')).toBeVisible()
  await page.goto('/exercises/not-a-real-id')
  await expect(page.getByText('未找到该动作。')).toBeVisible()
  await page.getByRole('link', { name: '返回动作列表' }).click()
  await expect(page).toHaveURL(/\/exercises$/)
})
