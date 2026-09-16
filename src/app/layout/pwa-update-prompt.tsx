import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** 应用一直停在前台时，最多隔这么久主动复查一次 sw.js。 */
const updateCheckIntervalMs = 15 * 60 * 1000

export function PwaUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const updateServiceWorker = useRef<ReturnType<typeof registerSW> | null>(null)

  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined
    updateServiceWorker.current = registerSW({
      onNeedRefresh() {
        setUpdateAvailable(true)
      },
      onRegisteredSW(_swUrl, activeRegistration) {
        registration = activeRegistration
      },
    })

    /* 本项目的 Service Worker 是「新版本先停在 waiting、等用户点更新」的模型
       （vite.config.ts 里 registerType: 'prompt'）。问题在于 registerSW() 只在组件
       mount 时跑一次：iOS 从主屏图标切回前台属于 resume 而不是冷启动，组件不会重新
       mount，于是整个会话都不再检查更新，waiting 中的新版本永远等不到激活 ——
       用户就会一直看到旧版，即使远端早就部署好了。这里补上「回到前台就复查一次」。 */
    const checkForUpdate = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        // update() 只是重新拉取 sw.js。真有新版本时由 onNeedRefresh 弹提示，
        // 不自动激活、不自动刷新页面，避免打断正在录入的训练。
        const target = registration ?? (await navigator.serviceWorker.getRegistration())
        await target?.update()
      } catch {
        // 离线或浏览器限制，忽略；下一个周期或下次回到前台再试。
      }
    }
    const checkOnForeground = () => void checkForUpdate()
    document.addEventListener('visibilitychange', checkOnForeground)
    window.addEventListener('focus', checkOnForeground)
    const timer = window.setInterval(checkOnForeground, updateCheckIntervalMs)
    return () => {
      document.removeEventListener('visibilitychange', checkOnForeground)
      window.removeEventListener('focus', checkOnForeground)
      window.clearInterval(timer)
    }
  }, [])

  if (!updateAvailable) {
    return null
  }

  return (
    <aside aria-live="polite" className="update-prompt">
      <p>有新版本可用。</p>
      <div className="update-prompt__actions">
        <button onClick={() => setUpdateAvailable(false)} type="button">
          稍后
        </button>
        <button onClick={() => void updateServiceWorker.current?.(true)} type="button">
          更新
        </button>
      </div>
    </aside>
  )
}
