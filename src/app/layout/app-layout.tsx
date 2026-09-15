import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './bottom-navigation'
import { PwaUpdatePrompt } from './pwa-update-prompt'

export function AppLayout() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNavigation />
      <PwaUpdatePrompt />
    </div>
  )
}
