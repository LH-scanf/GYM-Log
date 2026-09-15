import { expect, test } from '@playwright/test'

const emptyBackup = JSON.stringify({
  format: 'gymlog-backup',
  version: 1,
  exportedAt: '2026-09-15T00:30:00.000Z',
  data: {
    exerciseFamilies: [],
    exercises: [],
    workoutSessions: [],
    exerciseBlocks: [],
    exerciseRecords: [],
    settings: [],
  },
})

test('exports a backup and validates an import before replacing local data', async ({
  page,
}) => {
  await page.goto('/exercises/new')
  await page.getByLabel('动作名称').fill('导入测试卧推')
  await page.getByLabel('重量').selectOption('REQUIRED')
  await page.getByLabel('普通负重').check()
  await page.getByRole('button', { name: '保存动作' }).click()
  await page.getByRole('link', { name: '设置' }).click()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON 备份' }).click()
  expect((await download).suggestedFilename()).toMatch(
    /^gymlog-backup-\d{4}-\d{2}-\d{2}\.json$/,
  )
  await expect(page.getByText('最近备份：')).not.toContainText('尚未导出过备份')

  await page.locator('input[type=file]').setInputFiles({
    name: 'restore.json',
    mimeType: 'application/json',
    buffer: Buffer.from(emptyBackup),
  })
  await expect(page.getByRole('heading', { name: '导入摘要' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '确认完整替换并恢复' }).click()
  await expect(page.getByText('备份已恢复。')).toBeVisible()
  await page.getByRole('link', { name: '动作' }).click()
  await expect(page.getByText('没有动作。')).toBeVisible()
})
