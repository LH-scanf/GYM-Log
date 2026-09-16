import { useState } from 'react'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import type { ExerciseRecord, ExerciseRecordValues } from '../../domain/exercise/types'
import { workoutLoggingService } from '../../application/workout-logging-service'
import { AppIcon, EmptyState, Sheet } from '../../shared/components/ui'
import { formatRecord } from './workout-format'

const fields = ['load', 'reps', 'duration', 'distance', 'speed', 'incline'] as const
const labels = {
  load: '重量',
  reps: '次数',
  duration: '时间',
  distance: '距离',
  speed: '速度',
  incline: '坡度',
}
const units = {
  load: 'kg',
  reps: '次',
  duration: 'min',
  distance: 'km',
  speed: 'km/h',
  incline: '%',
}
type Field = (typeof fields)[number]
type Props = {
  item: WorkoutDetail['blocks'][number]
  sessionId: string
  onChanged: () => void
}

export function ExerciseBlockEditor({ item, sessionId, onChanged }: Props) {
  const [message, setMessage] = useState<string>()
  const [previous, setPrevious] =
    useState<Awaited<ReturnType<typeof workoutLoggingService.previousPerformance>>>()
  const [previousOpen, setPreviousOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const cardio =
    item.exercise.recordSchema.duration !== 'DISABLED' &&
    item.exercise.recordSchema.reps === 'DISABLED'
  const activeFields = fields.filter(
    (field) => item.exercise.recordSchema[field] !== 'DISABLED',
  )
  const createNext = async () => {
    try {
      const latest = item.records.at(-1)
      if (!latest) {
        setMessage('先填写这一组所需字段。')
        return
      }
      await workoutLoggingService.addRecord(item.block.id, toValues(latest))
      onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法添加记录。')
    }
  }
  const removeBlock = async () => {
    if (!window.confirm(`删除动作“${item.exercise.name}”及其当前记录？`)) return
    await workoutLoggingService.removeBlock(item.block.id)
    onChanged()
  }
  const showPrevious = async () => {
    setPrevious(
      await workoutLoggingService.previousPerformance(item.exercise.id, sessionId),
    )
    setPreviousOpen(true)
  }
  return (
    <section className="exercise-group">
      <div className="exercise-card__header">
        <h2>{item.exercise.name}</h2>
        <div className="exercise-card__more">
          <button
            className="exercise-card__previous"
            onClick={() => void showPrevious()}
            type="button"
          >
            上次 &gt;
          </button>
          <div className="workout-overflow">
            <button
              aria-label={`更多 ${item.exercise.name} 操作`}
              className="icon-button"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <AppIcon name="more" />
            </button>
            {menuOpen && (
              <div className="workout-overflow__menu">
                <button
                  className="danger-button"
                  onClick={() => void removeBlock()}
                  type="button"
                >
                  删除动作
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className={`exercise-card__table-head${cardio ? ' exercise-card__table-head--cardio' : ''}`}
      >
        <span>#</span>
        {cardio ? (
          activeFields.map((field) => <span key={field}>{labels[field]}</span>)
        ) : (
          <>
            <span>{item.exercise.loadMode === 'ASSISTANCE' ? '辅助重量' : '重量'}</span>
            <span>×</span>
            <span>次数</span>
          </>
        )}
        <span />
      </div>
      <div className="record-list">
        {item.records.map((record, index) => (
          <EditableRecordRow
            activeFields={activeFields}
            exercise={item.exercise}
            index={index}
            key={record.id}
            onChanged={onChanged}
            record={record}
          />
        ))}
        {item.records.length === 0 && (
          <DraftRecordRow
            activeFields={activeFields}
            exercise={item.exercise}
            onChanged={onChanged}
            blockId={item.block.id}
          />
        )}
      </div>
      <button
        className="quiet-button exercise-card__add"
        onClick={() => void createNext()}
        type="button"
      >
        + {cardio ? '添加一段' : '添加一组'}
      </button>
      {message && (
        <p className="form-warning" role="status">
          {message}
        </p>
      )}
      {previousOpen && (
        <Sheet onClose={() => setPreviousOpen(false)} title="上次训练表现">
          <div className="sheet__content">
            {previous === undefined ? (
              <EmptyState title="此前没有该动作记录" />
            ) : (
              <>
                <p className="field-hint">{previous.session.date}</p>
                {previous.records.map((record, index) => (
                  <p key={record.id}>
                    {index + 1}. {formatRecord(record, item.exercise)}
                  </p>
                ))}
              </>
            )}
          </div>
        </Sheet>
      )}
    </section>
  )
}

function EditableRecordRow({
  record,
  index,
  exercise,
  activeFields,
  onChanged,
}: {
  record: ExerciseRecord
  index: number
  exercise: WorkoutDetail['blocks'][number]['exercise']
  activeFields: Field[]
  onChanged: () => void
}) {
  const [values, setValues] = useState<ExerciseRecordValues>(toValues(record))
  const save = async () => {
    try {
      await workoutLoggingService.updateRecord(record.id, values)
      onChanged()
    } catch {
      /* validation remains in the row until corrected */
    }
  }
  const cardio =
    exercise.recordSchema.duration !== 'DISABLED' &&
    exercise.recordSchema.reps === 'DISABLED'
  return (
    <div className={`record-row${cardio ? ' record-row--cardio' : ''}`}>
      <span className="record-row__index">{index + 1}</span>
      {activeFields.map((field, fieldIndex) => (
        <>
          <RecordInput
            field={field}
            key={field}
            onBlur={() => void save()}
            onChange={(value) => setValues({ ...values, [field]: value })}
            value={values[field]}
          />
          {!cardio && fieldIndex === 0 && <span className="record-times">×</span>}
        </>
      ))}
      <button
        aria-label={`删除第 ${index + 1} 条记录`}
        className="icon-button record-delete"
        onClick={() => void workoutLoggingService.removeRecord(record.id).then(onChanged)}
        type="button"
      >
        <AppIcon name="delete" />
      </button>
    </div>
  )
}

function DraftRecordRow({
  blockId,
  exercise,
  activeFields,
  onChanged,
}: {
  blockId: string
  exercise: WorkoutDetail['blocks'][number]['exercise']
  activeFields: Field[]
  onChanged: () => void
}) {
  const [values, setValues] = useState<ExerciseRecordValues>({})
  const [error, setError] = useState<string>()
  const cardio =
    exercise.recordSchema.duration !== 'DISABLED' &&
    exercise.recordSchema.reps === 'DISABLED'
  const save = async () => {
    try {
      await workoutLoggingService.addRecord(blockId, values)
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '请填写这一组。')
    }
  }
  return (
    <>
      <div className={`record-row${cardio ? ' record-row--cardio' : ''}`}>
        <span className="record-row__index">1</span>
        {activeFields.map((field, fieldIndex) => (
          <>
            <RecordInput
              field={field}
              key={field}
              onChange={(value) => setValues({ ...values, [field]: value })}
              value={values[field]}
            />
            {!cardio && fieldIndex === 0 && <span className="record-times">×</span>}
          </>
        ))}
        <span />
      </div>
      <button
        className="quiet-button exercise-card__add"
        onClick={() => void save()}
        type="button"
      >
        保存这一组
      </button>
      {error && <p className="form-warning">{error}</p>}
    </>
  )
}

function RecordInput({
  field,
  value,
  onChange,
  onBlur,
}: {
  field: Field
  value: number | undefined
  onChange: (value: number | undefined) => void
  onBlur?: () => void
}) {
  return (
    <span className="record-field">
      <input
        aria-label={labels[field]}
        className="record-row__input"
        inputMode={field === 'reps' ? 'numeric' : 'decimal'}
        onBlur={onBlur}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
        step={field === 'reps' ? 1 : 'any'}
        type="number"
        value={value ?? ''}
      />
      <span className="record-field__unit">{units[field]}</span>
    </span>
  )
}
function toValues(record: ExerciseRecord): ExerciseRecordValues {
  return {
    ...(record.load === undefined ? {} : { load: record.load }),
    ...(record.reps === undefined ? {} : { reps: record.reps }),
    ...(record.duration === undefined ? {} : { duration: record.duration }),
    ...(record.distance === undefined ? {} : { distance: record.distance }),
    ...(record.speed === undefined ? {} : { speed: record.speed }),
    ...(record.incline === undefined ? {} : { incline: record.incline }),
    ...(record.side === undefined ? {} : { side: record.side }),
  }
}
