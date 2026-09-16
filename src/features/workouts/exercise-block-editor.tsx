import { useState, type CSSProperties } from 'react'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import type { ExerciseRecord, ExerciseRecordValues } from '../../domain/exercise/types'
import { workoutLoggingService } from '../../application/workout-logging-service'
import { AppIcon, EmptyState, Sheet } from '../../shared/components/ui'
import { formatRecord } from './workout-format'

const fieldOrder = [
  'load',
  'reps',
  'duration',
  'distance',
  'speed',
  'incline',
  'side',
] as const

const labels = {
  load: '重量',
  reps: '次数',
  duration: '时间',
  distance: '距离',
  speed: '速度',
  incline: '坡度',
  side: '侧别',
}

const units: Record<Field, string> = {
  load: 'kg',
  reps: '次',
  duration: 'min',
  distance: 'km',
  speed: 'km/h',
  incline: '%',
  side: '',
}

const sideOptions: {
  value: NonNullable<ExerciseRecordValues['side']>
  label: string
}[] = [
  { value: 'LEFT', label: '左' },
  { value: 'RIGHT', label: '右' },
  { value: 'BOTH', label: '双侧' },
]

type Field = (typeof fieldOrder)[number]
type Cell = { kind: 'field'; field: Field } | { kind: 'separator'; label: string }
type Exercise = WorkoutDetail['blocks'][number]['exercise']
type Props = {
  item: WorkoutDetail['blocks'][number]
  sessionId: string
  onChanged: () => void
  readOnly?: boolean
}

function isCardioExercise(exercise: Exercise): boolean {
  return (
    exercise.recordSchema.duration !== 'DISABLED' &&
    exercise.recordSchema.reps === 'DISABLED'
  )
}

function activeFieldsOf(exercise: Exercise): Field[] {
  return fieldOrder.filter((field) => exercise.recordSchema[field] !== 'DISABLED')
}

/**
 * The record row is a grid whose columns follow the exercise schema, so a cardio
 * exercise (duration · speed · incline) and a strength exercise (load × reps)
 * share one DOM shape instead of two bespoke layouts.
 */
function buildCells(exercise: Exercise, activeFields: Field[]): Cell[] {
  const separated = !isCardioExercise(exercise)
  const cells: Cell[] = []
  activeFields.forEach((field, index) => {
    if (index > 0 && separated) {
      cells.push({ kind: 'separator', label: index === 1 ? '×' : '·' })
    }
    cells.push({ kind: 'field', field })
  })
  return cells
}

/** Custom properties are not part of React's CSSProperties map, so build the
 *  style object through one typed helper instead of casting at every call site. */
function rowStyle(columns: string): CSSProperties {
  return { '--record-columns': columns } as CSSProperties
}

function columnsFor(cells: Cell[]): string {
  const parts = cells.map((cell) =>
    cell.kind === 'separator' ? (cell.label === '×' ? '46px' : '18px') : 'minmax(0, 1fr)',
  )
  return ['20px', ...parts, '44px'].join(' ')
}

function headLabel(exercise: Exercise, field: Field): string {
  if (field === 'load') {
    return exercise.loadMode === 'ASSISTANCE' ? '辅助重量' : '重量'
  }
  return labels[field]
}

function incompleteMessage(
  exercise: Exercise,
  values: ExerciseRecordValues,
): string | undefined {
  const missing = activeFieldsOf(exercise).filter(
    (field) => exercise.recordSchema[field] === 'REQUIRED' && values[field] === undefined,
  )
  if (missing.length === 0) return undefined
  return `请填写${missing.map((field) => labels[field]).join('、')}。`
}

export function ExerciseBlockEditor({
  item,
  sessionId,
  onChanged,
  readOnly = false,
}: Props) {
  const [message, setMessage] = useState<string>()
  const [previous, setPrevious] =
    useState<Awaited<ReturnType<typeof workoutLoggingService.previousPerformance>>>()
  const [previousOpen, setPreviousOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  /* A warning is only ever about the current input. The moment the user touches
     any field of this block the warning is stale, so drop it — otherwise
     "先填写这一组所需字段。" would sit there after the value was already filled. */
  const clearWarning = () => setMessage(undefined)
  const cardio = isCardioExercise(item.exercise)
  const activeFields = activeFieldsOf(item.exercise)
  const cells = buildCells(item.exercise, activeFields)
  const columns = columnsFor(cells)
  const createNext = async () => {
    try {
      const latest = item.records.at(-1)
      if (!latest) {
        setMessage('先填写这一组所需字段。')
        return
      }
      await workoutLoggingService.addRecord(item.block.id, toValues(latest))
      setMessage(undefined)
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
          {!readOnly && (
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
          )}
        </div>
      </div>
      <div
        className={`exercise-card__table-head${cardio ? ' exercise-card__table-head--cardio' : ''}`}
        style={rowStyle(columns)}
      >
        <span>#</span>
        {cells.map((cell, index) => (
          <span key={`${cell.kind}-${index}`}>
            {cell.kind === 'separator'
              ? cell.label
              : headLabel(item.exercise, cell.field)}
          </span>
        ))}
        <span />
      </div>
      <div className="record-list">
        {item.records.map((record, index) =>
          readOnly ? (
            <div
              className={`record-row${cardio ? ' record-row--cardio' : ''}`}
              key={record.id}
              style={rowStyle(columns)}
            >
              <span className="record-row__index">{index + 1}</span>
              <RecordCells
                cells={cells}
                onChange={() => undefined}
                static
                values={toValues(record)}
              />
              <span />
            </div>
          ) : (
            <EditableRecordRow
              cardio={cardio}
              cells={cells}
              columns={columns}
              exercise={item.exercise}
              index={index}
              key={record.id}
              onChanged={onChanged}
              onEdit={clearWarning}
              record={record}
            />
          ),
        )}
        {item.records.length === 0 && readOnly && (
          <p className="record-empty">没有记录</p>
        )}
        {item.records.length === 0 && !readOnly && (
          <DraftRecordRow
            blockId={item.block.id}
            cardio={cardio}
            cells={cells}
            columns={columns}
            exercise={item.exercise}
            onChanged={onChanged}
            onEdit={clearWarning}
          />
        )}
      </div>
      {!readOnly && (
        <button
          className="quiet-button exercise-card__add"
          onClick={() => void createNext()}
          type="button"
        >
          + {cardio ? '添加一段' : '添加一组'}
        </button>
      )}
      {message && (
        <p className="form-warning" role="alert">
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

function RecordCells({
  cells,
  values,
  static: isStatic,
  onChange,
  onBlur,
}: {
  cells: Cell[]
  values: ExerciseRecordValues
  static?: boolean
  onChange: (field: Field, value: ExerciseRecordValues[Field]) => void
  onBlur?: () => void
}) {
  if (isStatic) {
    return (
      <>
        {cells.map((cell, index) =>
          cell.kind === 'separator' ? (
            <span className="record-times" key={`sep-${index}`}>
              {cell.label}
            </span>
          ) : (
            <span className="record-field record-field--static" key={cell.field}>
              <span className="record-field__value">
                {values[cell.field] === undefined
                  ? '—'
                  : readCellText(cell.field, values)}
              </span>
            </span>
          ),
        )}
      </>
    )
  }
  return (
    <>
      {cells.map((cell, index) =>
        cell.kind === 'separator' ? (
          <span className="record-times" key={`sep-${index}`}>
            {cell.label}
          </span>
        ) : (
          <RecordInput
            field={cell.field}
            key={cell.field}
            onBlur={onBlur}
            onChange={(value) => onChange(cell.field, value)}
            value={values[cell.field]}
          />
        ),
      )}
    </>
  )
}

function readCellText(field: Field, values: ExerciseRecordValues): string {
  const value = values[field]
  if (field === 'side') {
    return sideOptions.find((option) => option.value === value)?.label ?? '—'
  }
  return `${value}${units[field]}`
}

function EditableRecordRow({
  record,
  index,
  exercise,
  cardio,
  cells,
  columns,
  onChanged,
  onEdit,
}: {
  record: ExerciseRecord
  index: number
  exercise: Exercise
  cardio: boolean
  cells: Cell[]
  columns: string
  onChanged: () => void
  /** 用户开始编辑本行的任何一个字段时触发，用于清掉块级提醒。 */
  onEdit: () => void
}) {
  const [values, setValues] = useState<ExerciseRecordValues>(toValues(record))
  const [error, setError] = useState<string>()
  const save = async () => {
    const incomplete = incompleteMessage(exercise, values)
    if (incomplete !== undefined) {
      setError(incomplete)
      return
    }
    try {
      await workoutLoggingService.updateRecord(record.id, values)
      setError(undefined)
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法保存这一组。')
    }
  }
  return (
    <div className="record-row-group">
      <div
        className={`record-row${cardio ? ' record-row--cardio' : ''}`}
        style={rowStyle(columns)}
      >
        <span className="record-row__index">{index + 1}</span>
        <RecordCells
          cells={cells}
          onBlur={() => void save()}
          onChange={(field, value) => {
            setValues({ ...values, [field]: value })
            setError(undefined)
            onEdit()
          }}
          values={values}
        />
        <button
          aria-label={`删除第 ${index + 1} 条记录`}
          className="icon-button record-delete"
          onClick={() =>
            void workoutLoggingService.removeRecord(record.id).then(onChanged)
          }
          type="button"
        >
          <AppIcon name="delete" />
        </button>
      </div>
      {error && (
        <p className="form-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function DraftRecordRow({
  blockId,
  exercise,
  cardio,
  cells,
  columns,
  onChanged,
  onEdit,
}: {
  blockId: string
  exercise: Exercise
  cardio: boolean
  cells: Cell[]
  columns: string
  onChanged: () => void
  /** 用户开始编辑本行的任何一个字段时触发，用于清掉块级提醒。 */
  onEdit: () => void
}) {
  const [values, setValues] = useState<ExerciseRecordValues>({})
  const [error, setError] = useState<string>()
  const save = async () => {
    const incomplete = incompleteMessage(exercise, values)
    if (incomplete !== undefined) {
      setError(incomplete)
      return
    }
    try {
      await workoutLoggingService.addRecord(blockId, values)
      setError(undefined)
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '请填写这一组。')
    }
  }
  return (
    <div className="record-row-group">
      <div
        className={`record-row${cardio ? ' record-row--cardio' : ''}`}
        style={rowStyle(columns)}
      >
        <span className="record-row__index">1</span>
        <RecordCells
          cells={cells}
          onChange={(field, value) => {
            setValues({ ...values, [field]: value })
            setError(undefined)
            onEdit()
          }}
          values={values}
        />
        <span />
      </div>
      <button
        className="quiet-button exercise-card__add"
        onClick={() => void save()}
        type="button"
      >
        保存这一组
      </button>
      {error && (
        <p className="form-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function RecordInput({
  field,
  value,
  onChange,
  onBlur,
}: {
  field: Field
  value: ExerciseRecordValues[Field]
  onChange: (value: ExerciseRecordValues[Field]) => void
  onBlur?: () => void
}) {
  if (field === 'side') {
    return (
      <span className="record-field">
        <select
          aria-label={labels.side}
          className="record-row__select"
          onBlur={onBlur}
          onChange={(event) =>
            onChange(
              event.target.value === ''
                ? undefined
                : (event.target.value as ExerciseRecordValues['side']),
            )
          }
          value={typeof value === 'string' ? value : ''}
        >
          <option value="">—</option>
          {sideOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    )
  }
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
        value={typeof value === 'number' ? value : ''}
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
