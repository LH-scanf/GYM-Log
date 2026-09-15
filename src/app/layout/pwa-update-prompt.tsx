import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function PwaUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const updateServiceWorker = useRef<ReturnType<typeof registerSW> | null>(null)

  useEffect(() => {
    updateServiceWorker.current = registerSW({
      onNeedRefresh() {
        setUpdateAvailable(true)
      },
    })
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
