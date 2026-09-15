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
          to={to}
        >
          <AppIcon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
