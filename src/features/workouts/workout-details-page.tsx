import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { workoutLoggingService } from '../../application/workout-logging-service'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import { calculateWorkoutDuration } from '../../domain/workout/duration'
import { formatDuration, formatRecord } from './workout-format'
import { AppIcon, TopBar } from '../../shared/components/ui'

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
  const workoutId = detail.session.id
  async function remove() {
    if (!window.confirm('删除本次训练及其中全部动作记录？')) return
    await workoutLoggingService.cancelSession(workoutId)
    navigate('/')
  }
  return (
    <section className="page">
      <TopBar
        backTo={
          <Link aria-label="返回训练" className="icon-button" to="/">
            <AppIcon name="back" />
          </Link>
        }
        title="训练详情"
      />
      <p className="eyebrow">{detail.session.date}</p>
      {editing ? (
        <SessionEditor
          detail={detail}
          onDone={() => {
            setEditing(false)
            void load()
          }}
        />
      ) : (
        <>
          <p>
            {detail.session.startTime ?? '--'} – {detail.session.endTime ?? '--'} ·{' '}
            {formatDuration(duration)}
          </p>
          {detail.blocks.map((item, index) => (
            <section className="exercise-group" key={item.block.id}>
              <h2>{item.exercise.name}</h2>
              {item.records.map((record, recordIndex) => (
                <div className="exercise-row" key={record.id}>
                  <span>{formatRecord(record, item.exercise)}</span>
                  <div className="row-actions">
                    <button
                      onClick={() =>
                        void workoutLoggingService.moveRecord(record.id, -1).then(load)
                      }
                      disabled={recordIndex === 0}
                    >
                      上移
                    </button>
                    <button
                      onClick={() =>
                        void workoutLoggingService.moveRecord(record.id, 1).then(load)
                      }
                      disabled={recordIndex === item.records.length - 1}
                    >
                      下移
                    </button>
                  </div>
                </div>
              ))}
              <div className="row-actions">
                <button
                  onClick={() =>
                    void workoutLoggingService.moveBlock(item.block.id, -1).then(load)
                  }
                  disabled={index === 0}
                >
                  动作上移
                </button>
                <button
                  onClick={() =>
                    void workoutLoggingService.moveBlock(item.block.id, 1).then(load)
                  }
                  disabled={index === detail.blocks.length - 1}
                >
                  动作下移
                </button>
              </div>
            </section>
          ))}
          <button className="primary-button" onClick={() => setEditing(true)}>
            编辑
          </button>
          <button className="danger-button" onClick={() => void remove()}>
            删除本次训练
          </button>
        </>
      )}
    </section>
  )
}

function SessionEditor({
  detail,
  onDone,
}: {
  detail: WorkoutDetail
  onDone: () => void
}) {
  const [date, setDate] = useState(detail.session.date)
  const [startTime, setStartTime] = useState(detail.session.startTime ?? '')
  const [endTime, setEndTime] = useState(detail.session.endTime ?? '')
  const [error, setError] = useState<string>()
  async function save() {
    try {
      await workoutLoggingService.finishSession(detail.session.id, {
        date,
        ...(startTime === '' ? {} : { startTime }),
        ...(endTime === '' ? {} : { endTime }),
      })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法保存。')
    }
  }
  return (
    <section className="family-management">
      <label>
        日期
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <label>
        开始时间
        <input
          type="time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
      </label>
      <label>
        结束时间
        <input
          type="time"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" onClick={() => void save()}>
        保存编辑
      </button>
    </section>
  )
}
