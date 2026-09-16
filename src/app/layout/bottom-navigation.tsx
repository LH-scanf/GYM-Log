import { NavLink } from 'react-router-dom'
import { AppIcon } from '../../shared/components/ui'

const navigationItems = [
  { to: '/', label: '训练', icon: 'training', end: true },
  { to: '/statistics', label: '统计', icon: 'statistics', end: false },
  { to: '/exercises', label: '动作', icon: 'exercise', end: false },
  { to: '/settings', label: '设置', icon: 'settings', end: false },
] as const

export function BottomNavigation() {
  return (
    <nav aria-label="主导航" className="bottom-navigation">
      {navigationItems.map(({ to, label, icon, end }) => (
        <NavLink
          className={({ isActive }) =>
            `bottom-navigation__item${isActive ? ' bottom-navigation__item--active' : ''}`
          }
          end={end}
          key={to}
          /* Tabs replace instead of push: switching tabs is lateral, not a
             drill-down, so it must not pile up history entries. Otherwise the
             iOS edge swipe walks back through every tab the user visited.
             Secondary pages (workout detail, exercise detail, …) keep pushing
             so a swipe back returns to the tab that opened them. */
          replace
          to={to}
        >
          <AppIcon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
