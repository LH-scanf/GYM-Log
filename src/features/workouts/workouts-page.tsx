import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { workoutLoggingService } from '../../application/workout-logging-service'
import type { WorkoutSession } from '../../domain/workout/types'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import { calculateWorkoutDuration } from '../../domain/workout/duration'
import { AppIcon, Sheet } from '../../shared/components/ui'
import { WorkoutEditor } from './workout-editor'
import { formatClock, formatCompactDuration, formatSessionDate } from './workout-format'

function localDate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
function localTime(): string {
  return new Date().toTimeString().slice(0, 5)
}
export function WorkoutsPage() {
  const [resumeDetail, setResumeDetail] = useState<WorkoutDetail>()
  const [historyDetails, setHistoryDetails] = useState<WorkoutDetail[]>([])
  const [date, setDate] = useState(localDate)
  const [startTime, setStartTime] = useState(localTime)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeId, setActiveId] = useState<string>()
  const [error, setError] = useState<string>()
  const refresh = useCallback(async () => {
    try {
      const sessions = await workoutLoggingService.listAllSessions()
      const ordered = [...sessions].sort(compareByRecency)
      const resume = ordered.find((session) => session.endTime === undefined)
      const others = ordered.filter((session) => session.id !== resume?.id)
      const [nextResume, nextHistory] = await Promise.all([
        resume === undefined
          ? Promise.resolve(undefined)
          : workoutLoggingService.getWorkout(resume.id),
        Promise.all(
          others.map((session) => workoutLoggingService.getWorkout(session.id)),
        ),
      ])
      setResumeDetail(nextResume)
      setHistoryDetails(
        nextHistory.filter((detail): detail is WorkoutDetail => detail !== undefined),
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
      setCreateOpen(false)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法创建训练。')
    }
  }
  const historyGroups = groupHistory(historyDetails)
  const resumeNames = resumeDetail === undefined ? '' : exerciseNames(resumeDetail)
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
          <div className="home-header">
            <div>
              <p className="eyebrow">GymLog</p>
              <h1 id="page-title">训练</h1>
            </div>
            <button
              className="primary-button"
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <AppIcon name="add" /> 新建训练
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {createOpen && (
            <CreateWorkoutSheet
              date={date}
              onClose={() => setCreateOpen(false)}
              onDateChange={setDate}
              onStartTimeChange={setStartTime}
              onSubmit={create}
              startTime={startTime}
            />
          )}
          {resumeDetail && (
            <button
              aria-label={`继续未完成训练 ${formatSessionDate(resumeDetail.session.date)}`}
              className="resume-card"
              onClick={() => setActiveId(resumeDetail.session.id)}
              type="button"
            >
              <span className="resume-card__mark">
                <AppIcon name="warning" size={18} />
              </span>
              <span className="resume-card__body">
                <span className="resume-card__title">未完成训练</span>
                <span className="resume-card__meta">
                  {formatSessionDate(resumeDetail.session.date)} ·{' '}
                  {sessionClock(resumeDetail.session)}
                </span>
                {resumeNames !== '' && (
                  <span className="resume-card__meta resume-card__meta--names">
                    {resumeNames}
                  </span>
                )}
              </span>
              <span className="resume-card__chevron">
                <AppIcon name="chevron" size={18} />
              </span>
            </button>
          )}
          {historyGroups.map(([label, details]) => (
            <section className="workout-week" key={label}>
              <p className="workout-week__label">{label}</p>
              {details.map((detail) => {
                const names = exerciseNames(detail)
                return (
                  <Link
                    className="workout-card"
                    key={detail.session.id}
                    to={`/workouts/${detail.session.id}`}
                  >
                    <span className="workout-card__top">
                      <strong className="workout-card__date">
                        {formatSessionDate(detail.session.date)}
                      </strong>
                      <span className="workout-card__tail">
                        {detail.session.endTime === undefined && (
                          <span className="workout-card__badge">未完成</span>
                        )}
                        <AppIcon name="chevron" size={18} />
                      </span>
                    </span>
                    <span className="workout-card__meta">
                      {sessionClock(detail.session)}
                    </span>
                    {names !== '' && (
                      <span className="workout-card__meta workout-card__meta--names">
                        {names}
                      </span>
                    )}
                  </Link>
                )
              })}
            </section>
          ))}
          {historyGroups.length === 0 && resumeDetail === undefined && (
            <p className="workout-empty">暂无训练记录</p>
          )}
        </>
      )}
    </section>
  )
}

function CreateWorkoutSheet({
  date,
  startTime,
  onDateChange,
  onStartTimeChange,
  onSubmit,
  onClose,
}: {
  date: string
  startTime: string
  onDateChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}) {
  return (
    <Sheet onClose={onClose} title="新建训练">
      <form className="sheet__content" onSubmit={onSubmit}>
        <div className="create-workout-fields">
          <label>
            日期
            <input
              onChange={(event) => onDateChange(event.target.value)}
              required
              type="date"
              value={date}
            />
          </label>
          <label>
            开始时间
            <input
              onChange={(event) => onStartTimeChange(event.target.value)}
              required
              type="time"
              value={startTime}
            />
          </label>
        </div>
        <button className="primary-button">开始训练</button>
      </form>
    </Sheet>
  )
}

function compareByRecency(a: WorkoutSession, b: WorkoutSession) {
  return `${b.date}${b.startTime ?? ''}`.localeCompare(`${a.date}${a.startTime ?? ''}`)
}

function sessionClock(session: WorkoutSession): string {
  const range = `${formatClock(session.startTime)} – ${formatClock(session.endTime)}`
  if (session.endTime === undefined) return range
  return `${range} · ${formatCompactDuration(
    calculateWorkoutDuration(session.startTime, session.endTime),
  )}`
}

function exerciseNames(detail: WorkoutDetail): string {
  return detail.blocks.map((item) => item.exercise.name).join(' · ')
}

function groupHistory(details: WorkoutDetail[]) {
  const today = new Date(`${localDate()}T12:00:00`)
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const groups = new Map<string, WorkoutDetail[]>()
  for (const detail of [...details].sort((a, b) =>
    compareByRecency(a.session, b.session),
  )) {
    const date = new Date(`${detail.session.date}T12:00:00`)
    const days = Math.floor((monday.getTime() - date.getTime()) / 86_400_000)
    const label = days <= 0 ? '本周' : days <= 7 ? '上周' : '更早'
    groups.set(label, [...(groups.get(label) ?? []), detail])
  }
  return [...groups.entries()]
}
