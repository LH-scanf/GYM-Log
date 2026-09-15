import type { Exercise, ExerciseRecord } from '../../domain/exercise/types'

export function formatRecord(record: ExerciseRecord, exercise?: Exercise): string {
  const load =
    record.load === undefined
      ? exercise?.loadMode === 'BODYWEIGHT_PLUS'
        ? '自重'
        : ''
      : `${exercise?.loadMode === 'BODYWEIGHT_PLUS' ? '+' : ''}${record.load}kg${exercise?.loadMode === 'ASSISTANCE' ? '辅助' : ''}`
  return [
    load,
    record.reps === undefined ? '' : `${record.reps}次`,
    record.duration === undefined ? '' : `${record.duration}min`,
    record.distance === undefined ? '' : `${record.distance}km`,
    record.speed === undefined ? '' : `${record.speed}km/h`,
    record.incline === undefined ? '' : `坡度${record.incline}`,
    record.side === 'LEFT'
      ? '左'
      : record.side === 'RIGHT'
        ? '右'
        : record.side === 'BOTH'
          ? '双侧'
          : '',
  ]
    .filter(Boolean)
    .join(' × ')
}

export function formatDuration(minutes: number | undefined): string {
  return minutes === undefined
    ? '未填写结束时间'
    : `${Math.floor(minutes / 60) > 0 ? `${Math.floor(minutes / 60)}h` : ''}${minutes % 60}min`
}
