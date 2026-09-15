import { NavLink } from 'react-router-dom'

const navigationItems = [
  { to: '/', label: '训练', end: true },
  { to: '/statistics', label: '统计', end: false },
  { to: '/exercises', label: '动作', end: false },
  { to: '/settings', label: '设置', end: false },
] as const

export function BottomNavigation() {
  return (
    <nav aria-label="主导航" className="bottom-navigation">
      {navigationItems.map(({ to, label, end }) => (
        <NavLink
          className={({ isActive }) =>
            `bottom-navigation__item${isActive ? ' bottom-navigation__item--active' : ''}`
          }
          end={end}
          key={to}
          to={to}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
