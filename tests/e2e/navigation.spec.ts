import { expect, test } from '@playwright/test'

test('opens the training page and switches between the four primary tabs', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()

  for (const { label, path } of [
    { label: '统计', path: '/statistics' },
    { label: '动作', path: '/exercises' },
    { label: '设置', path: '/settings' },
  ]) {
    await page.getByRole('link', { name: label }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
  }
})
