import { useCallback, useEffect, useRef, useState } from 'react'
import { workoutLoggingService } from '../../application/workout-logging-service'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import { calculateWorkoutDuration } from '../../domain/workout/duration'
import { AppIcon, TopBar } from '../../shared/components/ui'
import { ExercisePicker } from './exercise-picker'
import { ExerciseBlockEditor } from './exercise-block-editor'
import {
  formatClock,
  formatCompactDuration,
  formatSessionHeading,
} from './workout-format'

function localTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

export type WorkoutEditorMode = 'active' | 'history'

type Props = {
  sessionId: string
  mode?: WorkoutEditorMode
  onExit: () => void
}

/**
 * The single editing surface for a workout session. The Active Workout flow and
 * the historical detail page both mount this component so there is exactly one
 * Record Row / Exercise Card implementation to maintain.
 *
 * `active`  — an in-progress session: only the end time is editable, and the
 *             primary action finishes the workout.
 * `history` — a completed session: date, start time and end time are editable,
 *             and the primary action saves the changes.
 */
export function WorkoutEditor({ sessionId, mode = 'active', onExit }: Props) {
  const history = mode === 'history'
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState<string>()
  const [detail, setDetail] = useState<WorkoutDetail>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [invalidField, setInvalidField] = useState<'start' | 'end'>()
  const [saving, setSaving] = useState(false)
  const startTimeRef = useRef<HTMLInputElement>(null)
  const endTimeRef = useRef<HTMLInputElement>(null)
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
    const session = nextDetail?.session
    if (session !== undefined) {
      setDate((current) => (current === '' ? session.date : current))
      setStartTime((current) => (current === '' ? (session.startTime ?? '') : current))
      setEndTime((current) => current ?? session.endTime)
    }
  }, [sessionId])
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(id)
  }, [load])
  function applyEndTime(value: string) {
    setEndTime(value)
    setMessage(undefined)
    setInvalidField(undefined)
  }
  async function submit() {
    if (saving) return
    setMessage(undefined)
    setInvalidField(undefined)
    setSaving(true)
    try {
      const current = await workoutLoggingService.getWorkout(sessionId)
      if (current === undefined) {
        setSaving(false)
        setMessage('训练不存在，无法保存。')
        return
      }
      const session = current.session
      const nextDate = history ? date || session.date : session.date
      const nextStart = history ? startTime : (session.startTime ?? '')
      const nextEnd = endTime ?? session.endTime ?? ''
      if (nextStart === '') {
        setSaving(false)
        setMessage('请先填写开始时间。')
        setInvalidField('start')
        startTimeRef.current?.focus()
        return
      }
      if (nextEnd === '') {
        setSaving(false)
        setMessage(
          history ? '请先填写结束时间。' : '请先填写结束时间，或点击「填入当前时间」。',
        )
        setInvalidField('end')
        endTimeRef.current?.focus()
        return
      }
      await workoutLoggingService.finishSession(sessionId, {
        date: nextDate,
        startTime: nextStart,
        endTime: nextEnd,
      })
      setSaving(false)
      onExit()
    } catch (cause) {
      setSaving(false)
      setMessage(cause instanceof Error ? cause.message : '无法保存训练，请重试。')
    }
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
  async function remove() {
    const question = history
      ? '删除本次训练及其中全部动作记录？'
      : '放弃本次训练？其中的动作和记录将被删除。'
    if (!window.confirm(question)) return
    await workoutLoggingService.cancelSession(sessionId)
    onExit()
  }
  const session = detail?.session
  const resolvedDate = history ? date || (session?.date ?? '') : session?.date
  const resolvedStart = history ? startTime : session?.startTime
  const resolvedEndTime = endTime ?? session?.endTime ?? ''
  const duration = calculateWorkoutDuration(
    resolvedStart,
    resolvedEndTime === '' ? undefined : resolvedEndTime,
  )
  return (
    <section className="page workout-editor">
      <TopBar
        action={
          <div className="workout-overflow">
            <button
              aria-label="训练操作"
              className="icon-button"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <AppIcon name="more" />
            </button>
            {menuOpen && (
              <div className="workout-overflow__menu">
                {!history && <button onClick={onExit}>稍后继续</button>}
                <button className="danger-button" onClick={() => void remove()}>
                  {history ? '删除本次训练' : '放弃训练'}
                </button>
              </div>
            )}
          </div>
        }
        backTo={
          <button
            aria-label="返回训练"
            className="icon-button"
            onClick={onExit}
            type="button"
          >
            <AppIcon name="back" />
          </button>
        }
        title={history ? '编辑训练' : '训练记录'}
      />
      <section className="session-header">
        <div className="session-header__top">
          {history ? (
            <label className="session-field session-header__date-input">
              <span className="session-field__label">日期</span>
              <input
                aria-label="训练日期"
                className="session-field__input"
                onChange={(event) => {
                  setDate(event.target.value)
                  setMessage(undefined)
                }}
                type="date"
                value={resolvedDate ?? ''}
              />
            </label>
          ) : (
            <strong className="session-header__date">
              {formatSessionHeading(session?.date)}
            </strong>
          )}
          {resolvedEndTime === '' && <span className="session-badge">进行中</span>}
        </div>
        <div className="session-header__grid">
          <span className="session-field">
            {history ? (
              <label className="session-field__label" htmlFor="workout-start-time">
                开始
              </label>
            ) : (
              <span className="session-field__label">开始</span>
            )}
            {history ? (
              <input
                aria-label="开始时间"
                aria-invalid={invalidField === 'start'}
                className={`session-field__input${
                  invalidField === 'start' ? ' is-invalid' : ''
                }`}
                id="workout-start-time"
                onChange={(event) => {
                  setStartTime(event.target.value)
                  setMessage(undefined)
                  setInvalidField(undefined)
                }}
                ref={startTimeRef}
                type="time"
                value={resolvedStart ?? ''}
              />
            ) : (
              <strong className="session-field__value">
                {formatClock(resolvedStart)}
              </strong>
            )}
          </span>
          <span className="session-field">
            <label className="session-field__label" htmlFor="workout-end-time">
              结束
            </label>
            <input
              aria-invalid={invalidField === 'end'}
              aria-label="结束时间"
              className={`session-field__input${
                invalidField === 'end' ? ' is-invalid' : ''
              }`}
              id="workout-end-time"
              onChange={(event) => applyEndTime(event.target.value)}
              ref={endTimeRef}
              type="time"
              value={resolvedEndTime}
            />
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
        <div className="session-header__actions">
          <button
            className="session-header__now"
            onClick={() => applyEndTime(localTime())}
            type="button"
          >
            填入当前时间
          </button>
        </div>
        {message && (
          <p className="form-warning" role="alert">
            {message}
          </p>
        )}
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
        <p className="workout-hint">还没有添加动作，点下方「添加动作」开始记录。</p>
      )}
      <div className="sticky-actions">
        <button
          className="sticky-actions__add"
          onClick={() => setPickerOpen(true)}
          type="button"
        >
          <AppIcon name="add" /> 添加动作
        </button>
        <button
          className="sticky-actions__finish"
          disabled={saving}
          onClick={() => void submit()}
          type="button"
        >
          {history ? '保存修改' : '完成训练'}
        </button>
      </div>
    </section>
  )
}
