import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { workoutLoggingService } from '../../application/workout-logging-service'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import { calculateWorkoutDuration } from '../../domain/workout/duration'
import { AppIcon, TopBar } from '../../shared/components/ui'
import { ExerciseBlockEditor } from './exercise-block-editor'
import { WorkoutEditor } from './workout-editor'
import { formatClock, formatCompactDuration } from './workout-format'

export function WorkoutDetailsPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<WorkoutDetail>()
  const [editing, setEditing] = useState(false)
  const load = useCallback(
    async () => setDetail(await workoutLoggingService.getWorkout(sessionId ?? '')),
    [sessionId],
  )
  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])
  const workoutId = sessionId ?? ''
  async function remove() {
    if (!window.confirm('删除本次训练及其中全部动作记录？')) return
    await workoutLoggingService.cancelSession(workoutId)
    navigate('/', { replace: true })
  }
  if (editing) {
    return (
      <WorkoutEditor
        mode="history"
        onExit={() => {
          setEditing(false)
          void load()
        }}
        sessionId={workoutId}
      />
    )
  }
  if (!detail)
    return (
      <section className="page">
        <p role="status">正在加载训练…</p>
      </section>
    )
  const duration = calculateWorkoutDuration(
    detail.session.startTime,
    detail.session.endTime,
  )
  return (
    <section className="page">
      <TopBar
        backTo={
          <Link aria-label="返回训练" className="icon-button" replace to="/">
            <AppIcon name="back" />
          </Link>
        }
        title="训练详情"
      />
      <section className="session-header">
        <div className="session-header__top">
          <strong className="session-header__date">{detail.session.date}</strong>
          {detail.session.endTime === undefined && (
            <span className="session-badge">未完成</span>
          )}
        </div>
        <div className="session-header__grid">
          <span className="session-field">
            <span className="session-field__label">开始</span>
            <strong className="session-field__value">
              {formatClock(detail.session.startTime)}
            </strong>
          </span>
          <span className="session-field">
            <span className="session-field__label">结束</span>
            <strong className="session-field__value">
              {formatClock(detail.session.endTime)}
            </strong>
          </span>
          <span className="session-field">
            <span className="session-field__label">已训练</span>
            <strong
              className={`session-field__value${
                duration === undefined ? ' session-field__value--empty' : ''
              }`}
            >
              {formatCompactDuration(duration)}
            </strong>
          </span>
        </div>
      </section>
      {detail.blocks.map((item) => (
        <ExerciseBlockEditor
          item={item}
          key={item.block.id}
          onChanged={() => void load()}
          readOnly
          sessionId={workoutId}
        />
      ))}
      {detail.blocks.length === 0 && <p className="workout-hint">这次训练没有动作。</p>}
      <button className="primary-button" onClick={() => setEditing(true)} type="button">
        编辑
      </button>
      <button className="danger-button" onClick={() => void remove()} type="button">
        删除本次训练
      </button>
    </section>
  )
}
