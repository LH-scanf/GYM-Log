import type { LoadMode, RecordSchema } from '../../domain/exercise/types'

const labels: Record<keyof RecordSchema, string> = {
  load: '重量',
  reps: '次数',
  duration: '时间',
  distance: '距离',
  speed: '速度',
  incline: '坡度',
  side: '左右侧',
}

export function getExerciseSummary(schema: RecordSchema, loadMode: LoadMode): string {
  const enabled = (Object.keys(labels) as Array<keyof RecordSchema>)
    .filter((field) => schema[field] !== 'DISABLED')
    .map((field) => (field === 'load' ? getLoadLabel(loadMode) : labels[field]))

  return enabled.join(' · ')
}

function getLoadLabel(loadMode: LoadMode): string {
  if (loadMode === 'ASSISTANCE') {
    return '辅助重量'
  }

  if (loadMode === 'BODYWEIGHT_PLUS') {
    return '额外负重'
  }

  return '重量'
}
