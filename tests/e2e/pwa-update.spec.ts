import { expect, test } from '@playwright/test'

/**
 * 真机「明明云端是最新版，手机上还是旧版」的根因：`registerType: 'prompt'` 下新
 * Service Worker 会停在 waiting 等用户点更新，而 `registerSW()` 只在组件 mount 时
 * 跑一次 —— iOS 从主屏图标切回前台是 resume 不是冷启动，于是整个会话都不再检查更新。
 *
 * 这里只验证「回到前台会主动发起一次 registration.update()」这一条接线，
 * 不去真的替换 Service Worker（那需要控制 sw.js 内容，代价太大）。
 */

declare global {
  interface Window {
    __swUpdateCalls: number
  }
}

test('checks for a new service worker when the app returns to the foreground', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })

  // 在应用代码跑起来之前就把 update() 计数挂上
  await page.addInitScript(() => {
    window.__swUpdateCalls = 0
    if (!('ServiceWorkerRegistration' in window)) return
    const original = ServiceWorkerRegistration.prototype.update
    ServiceWorkerRegistration.prototype.update = function (...args: unknown[]) {
      window.__swUpdateCalls += 1
      return (original as (...rest: unknown[]) => Promise<void>).apply(this, args)
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: '训练', exact: true })).toBeVisible()

  // 必须先有 registration，否则 update() 不会被调用
  await page.evaluate(() => navigator.serviceWorker.ready)
  const before = await page.evaluate(() => window.__swUpdateCalls)

  // 模拟从主屏图标切回前台
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
  })

  await expect
    .poll(() => page.evaluate(() => window.__swUpdateCalls))
    .toBeGreaterThan(before)
})
