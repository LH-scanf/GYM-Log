import { useState } from 'react'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import type { ExerciseRecord, ExerciseRecordValues } from '../../domain/exercise/types'
import { workoutLoggingService } from '../../application/workout-logging-service'
import { AppIcon, EmptyState, Sheet } from '../../shared/components/ui'
import { formatRecord } from './workout-format'

const numericFields = [
  'load',
  'reps',
  'duration',
  'distance',
  'speed',
  'incline',
] as const
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
  duration: '分钟',
  distance: 'km',
  speed: 'km/h',
  incline: '%',
}

type Props = {
  item: WorkoutDetail['blocks'][number]
  sessionId: string
  onChanged: () => void
}

export function ExerciseBlockEditor({ item, sessionId, onChanged }: Props) {
  const [draft, setDraft] = useState<ExerciseRecordValues>({})
  const [message, setMessage] = useState<string>()
  const [previous, setPrevious] =
    useState<Awaited<ReturnType<typeof workoutLoggingService.previousPerformance>>>()
  const [previousOpen, setPreviousOpen] = useState(false)
  const cardio =
    item.exercise.recordSchema.duration !== 'DISABLED' &&
    item.exercise.recordSchema.reps === 'DISABLED'
  const save = async (values: ExerciseRecordValues) => {
    try {
      await workoutLoggingService.addRecord(item.block.id, values)
      setDraft({})
      setMessage(undefined)
      onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '记录未保存。')
    }
  }
  const showPrevious = async () => {
    setPrevious(
      await workoutLoggingService.previousPerformance(item.exercise.id, sessionId),
    )
    setPreviousOpen(true)
  }
  const removeBlock = async () => {
    if (!window.confirm(`删除动作“${item.exercise.name}”及其当前记录？`)) return
    await workoutLoggingService.removeBlock(item.block.id)
    onChanged()
  }
  return (
    <section className="exercise-group">
      <div className="exercise-card__header">
        <h2>{item.exercise.name}</h2>
        <div className="row-actions">
          <button
            className="quiet-button"
            onClick={() => void showPrevious()}
            type="button"
          >
            上次
          </button>
          <button
            aria-label={`删除动作 ${item.exercise.name}`}
            className="icon-button danger-button"
            onClick={() => void removeBlock()}
            type="button"
          >
            <AppIcon name="delete" />
          </button>
        </div>
      </div>
      {item.records.length > 0 && (
        <div className="record-list">
          {item.records.map((record, index) => (
            <RecordRow
              exercise={item.exercise}
              index={index}
              key={record.id}
              record={record}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
      <div className="record-composer">
        {numericFields
          .filter((field) => item.exercise.recordSchema[field] !== 'DISABLED')
          .map((field) => {
            const label =
              field === 'load' && item.exercise.loadMode === 'ASSISTANCE'
                ? '辅助重量'
                : labels[field]
            const placeholder =
              field === 'load' && item.exercise.loadMode === 'BODYWEIGHT_PLUS'
                ? '自重（留空）'
                : undefined
            return (
              <label key={field}>
                {label} <span className="field-hint">{units[field]}</span>
                <input
                  inputMode="decimal"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [field]:
                        event.target.value === ''
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  placeholder={placeholder}
                  type="number"
                  value={draft[field] ?? ''}
                />
              </label>
            )
          })}
        {item.exercise.recordSchema.side !== 'DISABLED' && (
          <label>
            侧别
            <select
              onChange={(event) =>
                setDraft({
                  ...draft,
                  side:
                    event.target.value === ''
                      ? undefined
                      : (event.target.value as ExerciseRecordValues['side']),
                })
              }
              value={draft.side ?? ''}
            >
              <option value="">未选择</option>
              <option value="LEFT">左</option>
              <option value="RIGHT">右</option>
              <option value="BOTH">双侧</option>
            </select>
          </label>
        )}
      </div>
      <div className="record-actions">
        <button className="primary-button" onClick={() => void save(draft)} type="button">
          {cardio ? '添加一段' : '添加一组'}
        </button>
        {item.records.length > 0 && (
          <button
            className="quiet-button"
            onClick={() => void save(copy(item.records.at(-1)!))}
            type="button"
          >
            复制上一条
          </button>
        )}
      </div>
      {message && (
        <p className="form-warning" role="status">
          {message}
        </p>
      )}
      {previousOpen && (
        <Sheet onClose={() => setPreviousOpen(false)} title="上次训练表现">
          <div className="sheet__content">
            {previous === undefined ? (
              <EmptyState
                description="完成一次该动作训练后，会在这里显示上次记录。"
                title="此前没有该动作记录"
              />
            ) : (
              <>
                <p className="field-hint">{previous.session.date}</p>
                <div className="record-list">
                  {previous.records.map((record, index) => (
                    <div className="record-row" key={record.id}>
                      <span className="record-row__index">{index + 1}</span>
                      <span className="record-row__value">
                        {formatRecord(record, item.exercise)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Sheet>
      )}
    </section>
  )
}

function RecordRow({
  exercise,
  index,
  record,
  onChanged,
}: {
  exercise: WorkoutDetail['blocks'][number]['exercise']
  index: number
  record: ExerciseRecord
  onChanged: () => void
}) {
  return (
    <div className="record-row">
      <span className="record-row__index">{index + 1}</span>
      <span className="record-row__value">{formatRecord(record, exercise)}</span>
      <button
        aria-label={`删除第 ${index + 1} 条记录`}
        className="icon-button danger-button"
        onClick={() => void workoutLoggingService.removeRecord(record.id).then(onChanged)}
        type="button"
      >
        <AppIcon name="delete" />
      </button>
    </div>
  )
}

function copy(record: ExerciseRecord): ExerciseRecordValues {
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
