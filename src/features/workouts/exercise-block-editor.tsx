import { useState } from 'react'
import type { WorkoutDetail } from '../../data/repositories/workout-repository'
import type { ExerciseRecord, ExerciseRecordValues } from '../../domain/exercise/types'
import { workoutLoggingService } from '../../application/workout-logging-service'

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

type Props = {
  item: WorkoutDetail['blocks'][number]
  sessionId: string
  onChanged: () => void
}

export function ExerciseBlockEditor({ item, sessionId, onChanged }: Props) {
  const [draft, setDraft] = useState<ExerciseRecordValues>({})
  const [message, setMessage] = useState<string>()
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
  const previous = async () => {
    const entry = await workoutLoggingService.previousPerformance(
      item.exercise.id,
      sessionId,
    )
    setMessage(
      entry === undefined
        ? '此前没有该动作的训练记录。'
        : `上次 · ${entry.session.date}：${entry.records.map(recordText).join('；')}`,
    )
  }
  return (
    <section className="exercise-group">
      <div className="page-heading">
        <h2>{item.exercise.name}</h2>
        <div className="row-actions">
          <button onClick={() => void previous()} type="button">
            上次
          </button>
          <button
            className="danger-button"
            onClick={() =>
              void workoutLoggingService.removeBlock(item.block.id).then(onChanged)
            }
            type="button"
          >
            删除动作
          </button>
        </div>
      </div>
      {item.records.map((record) => (
        <RecordRow key={record.id} record={record} onChanged={onChanged} />
      ))}
      <div className="schema-grid">
        {numericFields
          .filter((field) => item.exercise.recordSchema[field] !== 'DISABLED')
          .map((field) => (
            <label key={field}>
              {field === 'load' && item.exercise.loadMode === 'ASSISTANCE'
                ? '辅助重量'
                : labels[field]}
              <input
                inputMode="decimal"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    [field]:
                      event.target.value === '' ? undefined : Number(event.target.value),
                  })
                }
                placeholder={
                  field === 'load' && item.exercise.loadMode === 'BODYWEIGHT_PLUS'
                    ? '自重（留空）'
                    : undefined
                }
                type="number"
                value={draft[field] ?? ''}
              />
            </label>
          ))}
      </div>
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
      <button className="primary-button" onClick={() => void save(draft)} type="button">
        {cardio ? '添加一段' : '添加一组'}
      </button>
      {item.records.length > 0 && (
        <button onClick={() => void save(copy(item.records.at(-1)!))} type="button">
          复制上一条
        </button>
      )}
      {message && (
        <p className="form-warning" role="status">
          {message}
        </p>
      )}
    </section>
  )
}

function RecordRow({
  record,
  onChanged,
}: {
  record: ExerciseRecord
  onChanged: () => void
}) {
  return (
    <div className="exercise-row">
      <span>{recordText(record)}</span>
      <button
        className="danger-button"
        onClick={() => void workoutLoggingService.removeRecord(record.id).then(onChanged)}
        type="button"
      >
        删除
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
function recordText(record: ExerciseRecord) {
  return (
    [
      record.load === undefined ? '' : `${record.load}kg`,
      record.reps === undefined ? '' : `${record.reps}次`,
      record.duration === undefined ? '' : `${record.duration}min`,
      record.distance === undefined ? '' : `${record.distance}km`,
      record.speed === undefined ? '' : `${record.speed}km/h`,
      record.incline === undefined ? '' : `坡度${record.incline}`,
      record.side,
    ]
      .filter(Boolean)
      .join(' × ') || '自重'
  )
}
