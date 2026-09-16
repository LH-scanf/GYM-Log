import { useEffect, type ReactNode } from 'react'

type IconName =
  | 'training'
  | 'statistics'
  | 'exercise'
  | 'settings'
  | 'add'
  | 'close'
  | 'back'
  | 'more'
  | 'delete'
  | 'chevron'
  | 'warning'
  | 'clock'
  | 'trend'

const paths: Record<IconName, ReactNode> = {
  training: (
    <>
      <path d="M5 8h14M7 8v10m10-10v10M4 18h16" />
      <path d="M9 5h6" />
    </>
  ),
  statistics: (
    <>
      <path d="M5 19V10m5 9V5m5 14v-7m5 7V8" />
    </>
  ),
  exercise: (
    <>
      <path d="M4 9h4v6H4zM16 9h4v6h-4zM8 12h8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2m-3.6-6.4 1.4-1.4M5.2 18.8l1.4-1.4m0-11.8L5.2 4.2m13.6 14.6-1.4-1.4" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  back: <path d="m14 5-7 7 7 7" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
  delete: (
    <>
      <path d="M5 7h14M10 11v5m4-5v5M9 7l1-2h4l1 2m-8 0 1 12h8l1-12" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  warning: (
    <>
      <path d="M12 4.6 3.9 18.6h16.2z" />
      <path d="M12 10.2v3.6m0 2.6v.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.6V12l3 1.8" />
    </>
  ),
  trend: <path d="M4 16.5 9 11l3.5 3.5L20 6.5m0 0h-4.5m4.5 0v4.5" />,
}

export function AppIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="app-icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  )
}

export function TopBar({
  title,
  backTo,
  action,
  headingId,
}: {
  title: string
  backTo?: ReactNode
  action?: ReactNode
  headingId?: string
}) {
  return (
    <header className="top-bar">
      <div className="top-bar__side">{backTo}</div>
      <h1 id={headingId}>{title}</h1>
      <div className="top-bar__side top-bar__side--end">{action}</div>
    </header>
  )
}

/**
 * 页面级页头：左对齐大标题 + 右侧动作槽。
 * 与居中的 TopBar 区分——TopBar 用于有返回/工具按钮的二级页，
 * PageHeader 用于底部 Tab 的一级页面（统计 / 设置）。
 */
export function PageHeader({
  title,
  action,
  headingId,
}: {
  title: string
  action?: ReactNode
  headingId?: string
}) {
  return (
    <header className="page-header">
      <h1 id={headingId}>{title}</h1>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <section className="empty-state">
      <div className="empty-state__mark">
        <AppIcon name="training" />
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </section>
  )
}

export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className="sheet"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="sheet__handle" />
        <header className="sheet__header">
          <h2>{title}</h2>
          <button
            aria-label="关闭"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <AppIcon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
