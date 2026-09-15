import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { workoutLoggingService } from '../../application/workout-logging-service'
import type { WorkoutSession } from '../../domain/workout/types'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import { calculateWorkoutDuration } from '../../domain/workout/duration'
import { AppIcon, EmptyState, TopBar } from '../../shared/components/ui'
import { ExercisePicker } from './exercise-picker'
import { ExerciseBlockEditor } from './exercise-block-editor'
import { formatDuration } from './workout-format'

function localDate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
function localTime(): string {
  return new Date().toTimeString().slice(0, 5)
}
function weekday(date: string) {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(`${date}T12:00:00`).getDay()]
}

export function WorkoutsPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [history, setHistory] = useState<WorkoutSession[]>([])
  const [historyDetails, setHistoryDetails] = useState<WorkoutDetail[]>([])
  const [date, setDate] = useState(localDate)
  const [startTime, setStartTime] = useState(localTime)
  const [activeId, setActiveId] = useState<string>()
  const [error, setError] = useState<string>()
  const refresh = useCallback(async () => {
    try {
      const [unfinished, all] = await Promise.all([
        workoutLoggingService.listUnfinishedSessions(),
        workoutLoggingService.listAllSessions(),
      ])
      const completed = all.filter((session) => session.endTime !== undefined)
      setSessions(unfinished)
      setHistory(all)
      setHistoryDetails(
        (
          await Promise.all(
            completed.map((session) => workoutLoggingService.getWorkout(session.id)),
          )
        ).filter((detail): detail is WorkoutDetail => detail !== undefined),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取训练数据。')
    }
  }, [])
  useEffect(() => {
    const id = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(id)
  }, [refresh])
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
      {activeId ? (
        <WorkoutEditor
          onExit={() => {
            setActiveId(undefined)
            void refresh()
          }}
          sessionId={activeId}
        />
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">GymLog</p>
              <h1 id="page-title">训练</h1>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <form className="exercise-form" onSubmit={create}>
            <div className="schema-grid">
              <label>
                日期
                <input
                  onChange={(event) => setDate(event.target.value)}
                  required
                  type="date"
                  value={date}
                />
              </label>
              <label>
                开始时间
                <input
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                  type="time"
                  value={startTime}
                />
              </label>
            </div>
            <button className="primary-button">
              <AppIcon name="add" /> 新建训练
            </button>
          </form>
          {sessions.length > 0 && (
            <section className="family-management unfinished-card">
              <h2>继续未完成训练</h2>
              <p>训练尚未完成，不显示持续时间。</p>
              {sessions.map((session) => (
                <button
                  aria-label={`${session.date} · ${session.startTime ?? '未填写开始时间'}`}
                  className="workout-card"
                  key={session.id}
                  onClick={() => setActiveId(session.id)}
                  type="button"
                >
                  <span className="workout-card__top">
                    <strong className="workout-card__date">
                      {session.date} · 周{weekday(session.date)}
                    </strong>
                    <span>继续</span>
                  </span>
                  <span className="workout-card__meta">
                    开始于 {session.startTime ?? '未填写'}
                  </span>
                </button>
              ))}
            </section>
          )}
          <section className="family-management">
            <h2>训练历史</h2>
            {groupHistory(historyDetails).map(([label, details]) => (
              <section key={label}>
                <p className="eyebrow">{label}</p>
                {details.map((detail) => (
                  <Link
                    className="workout-card"
                    key={detail.session.id}
                    to={`/workouts/${detail.session.id}`}
                  >
                    <span className="workout-card__top">
                      <strong className="workout-card__date">
                        {detail.session.date} · 周{weekday(detail.session.date)}
                      </strong>
                      <span>查看</span>
                    </span>
                    <span className="workout-card__meta">
                      {detail.session.startTime ?? '--'} –{' '}
                      {detail.session.endTime ?? '--'} ·{' '}
                      {formatDuration(
                        calculateWorkoutDuration(
                          detail.session.startTime,
                          detail.session.endTime,
                        ),
                      )}
                    </span>
                    <span className="workout-card__meta">
                      {detail.blocks.map((item) => item.exercise.name).join('、') ||
                        '未记录动作'}
                    </span>
                  </Link>
                ))}
              </section>
            ))}
            {history.filter((session) => session.endTime !== undefined).length === 0 && (
              <EmptyState
                description="从一次训练开始，记录每组表现。"
                title="还没有训练历史。"
              />
            )}
          </section>
        </>
      )}
    </section>
  )
}

function groupHistory(details: WorkoutDetail[]) {
  const today = new Date(`${localDate()}T12:00:00`)
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const groups = new Map<string, WorkoutDetail[]>()
  for (const detail of [...details].sort((a, b) =>
    `${b.session.date}${b.session.startTime ?? ''}`.localeCompare(
      `${a.session.date}${a.session.startTime ?? ''}`,
    ),
  )) {
    const date = new Date(`${detail.session.date}T12:00:00`)
    const days = Math.floor((monday.getTime() - date.getTime()) / 86_400_000)
    const label = days < 7 ? '本周' : days < 14 ? '上周' : '更早'
    groups.set(label, [...(groups.get(label) ?? []), detail])
  }
  return [...groups.entries()]
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
    const id = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(id)
  }, [load])
  async function finish() {
    const current = await workoutLoggingService.getWorkout(sessionId)
    if (!current?.session.startTime) return
    await workoutLoggingService.finishSession(sessionId, {
      date: current.session.date,
      startTime: current.session.startTime,
      endTime,
    })
    onExit()
  }
  async function addExercise(exerciseId: string) {
    await workoutLoggingService.addBlock(sessionId, exerciseId)
    setPickerOpen(false)
    await load()
    window.setTimeout(
      () =>
        document
          .querySelector('.exercise-group:last-of-type')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      0,
    )
  }
  async function cancel() {
    if (!window.confirm('放弃本次训练？其中的动作和记录将被删除。')) return
    await workoutLoggingService.cancelSession(sessionId)
    onExit()
  }
  const session = detail?.session
  return (
    <section className="page workout-editor">
      <TopBar
        backTo={
          <button
            className="icon-button"
            aria-label="返回训练"
            onClick={onExit}
            type="button"
          >
            <AppIcon name="back" />
          </button>
        }
        title="训练记录"
      />
      <section className="session-header">
        <div className="session-header__grid">
          <span>
            日期<strong>{session?.date ?? '—'}</strong>
          </span>
          <span>
            开始<strong>{session?.startTime ?? '未填写'}</strong>
          </span>
          <span>
            结束<strong>{endTime}</strong>
          </span>
        </div>
        <label className="search-field">
          结束时间
          <input
            onChange={(event) => setEndTime(event.target.value)}
            type="time"
            value={endTime}
          />
        </label>
        <button
          className="quiet-button"
          onClick={() => setEndTime(localTime())}
          type="button"
        >
          填入当前时间
        </button>
      </section>
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
      {detail?.blocks.length === 0 && (
        <EmptyState description="从动作库选择一个动作开始记录。" title="还没有添加动作" />
      )}
      <div className="sticky-actions">
        <button
          className="quiet-button"
          onClick={() => setPickerOpen(true)}
          type="button"
        >
          <AppIcon name="add" /> 添加动作
        </button>
        <button className="primary-button" onClick={() => void finish()} type="button">
          完成训练
        </button>
      </div>
      <button className="text-link" onClick={onExit} type="button">
        稍后继续
      </button>
      <button
        className="text-link danger-button"
        onClick={() => void cancel()}
        type="button"
      >
        放弃训练
      </button>
    </section>
  )
}
