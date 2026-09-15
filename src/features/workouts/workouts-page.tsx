import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { workoutLoggingService } from '../../application/workout-logging-service'
import type { WorkoutSession } from '../../domain/workout/types'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import { ExercisePicker } from './exercise-picker'
import { ExerciseBlockEditor } from './exercise-block-editor'
import { Link } from 'react-router-dom'
import { calculateWorkoutDuration } from '../../domain/workout/duration'
import { formatDuration } from './workout-format'

function localDate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function localTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

export function WorkoutsPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [history, setHistory] = useState<WorkoutSession[]>([])
  const [date, setDate] = useState(localDate)
  const [startTime, setStartTime] = useState(localTime)
  const [activeId, setActiveId] = useState<string>()
  const [error, setError] = useState<string>()

  async function refresh() {
    try {
      setSessions(await workoutLoggingService.listUnfinishedSessions())
      setHistory(await workoutLoggingService.listAllSessions())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取未完成训练。')
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    try {
      const session = await workoutLoggingService.createSession({ date, startTime })
      setActiveId(session.id)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法创建训练。')
    }
  }

  return (
    <section aria-labelledby="page-title" className="page">
      <p className="eyebrow">GymLog</p>
      <h1 id="page-title">训练</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {activeId ? (
        <WorkoutEditor
          sessionId={activeId}
          onExit={() => {
            setActiveId(undefined)
            void refresh()
          }}
        />
      ) : (
        <>
          <form className="exercise-form" onSubmit={create}>
            <label>
              日期
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label>
              开始时间
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </label>
            <button className="primary-button">新建训练</button>
          </form>
          {sessions.length > 0 && (
            <section className="family-management">
              <h2>继续未完成训练</h2>
              {sessions.map((session) => (
                <button key={session.id} onClick={() => setActiveId(session.id)}>
                  {session.date} · {session.startTime}
                </button>
              ))}
            </section>
          )}
          <section className="family-management">
            <h2>训练历史</h2>
            {history
              .filter((session) => session.endTime !== undefined)
              .sort((left, right) =>
                `${right.date}${right.startTime ?? ''}`.localeCompare(
                  `${left.date}${left.startTime ?? ''}`,
                ),
              )
              .map((session) => (
                <Link
                  className="exercise-row__main"
                  key={session.id}
                  to={`/workouts/${session.id}`}
                >
                  <strong>{session.date}</strong>
                  <span>
                    {session.startTime ?? '--'} – {session.endTime ?? '--'} ·{' '}
                    {formatDuration(
                      calculateWorkoutDuration(session.startTime, session.endTime),
                    )}
                  </span>
                </Link>
              ))}
            {history.length === 0 && <p>还没有训练历史。</p>}
          </section>
        </>
      )}
    </section>
  )
}

function WorkoutEditor({ sessionId, onExit }: { sessionId: string; onExit: () => void }) {
  const [endTime, setEndTime] = useState(localTime)
  const [detail, setDetail] = useState<WorkoutDetail>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [exercises, setExercises] = useState(
    [] as Awaited<ReturnType<typeof workoutLoggingService.listAvailableExercises>>,
  )
  const load = useCallback(async () => {
    const [nextDetail, nextExercises] = await Promise.all([
      workoutLoggingService.getWorkout(sessionId),
      workoutLoggingService.listAvailableExercises(),
    ])
    setDetail(nextDetail)
    setExercises(nextExercises)
  }, [sessionId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  async function finish() {
    const detail = await workoutLoggingService.getWorkout(sessionId)
    if (!detail?.session.startTime) return
    await workoutLoggingService.finishSession(sessionId, {
      date: detail.session.date,
      startTime: detail.session.startTime,
      endTime,
    })
    onExit()
  }
  async function addExercise(exerciseId: string) {
    await workoutLoggingService.addBlock(sessionId, exerciseId)
    setPickerOpen(false)
    await load()
  }
  async function cancel() {
    if (!window.confirm('放弃本次训练？其中的动作和记录将被删除。')) return
    await workoutLoggingService.cancelSession(sessionId)
    onExit()
  }
  return (
    <section className="family-management">
      <h2>正在记录训练</h2>
      <button className="primary-button" onClick={() => setPickerOpen(true)}>
        添加动作
      </button>
      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          onClose={() => setPickerOpen(false)}
          onSelect={(id) => void addExercise(id)}
        />
      )}
      {detail?.blocks.map((item) => (
        <ExerciseBlockEditor
          item={item}
          key={item.block.id}
          onChanged={() => void load()}
          sessionId={sessionId}
        />
      ))}
      <label>
        结束时间
        <input
          type="time"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </label>
      <button className="primary-button" onClick={() => void finish()}>
        完成训练
      </button>
      <button className="danger-button" onClick={() => void cancel()}>
        放弃本次训练
      </button>
      <button onClick={onExit}>稍后继续</button>
    </section>
  )
}
