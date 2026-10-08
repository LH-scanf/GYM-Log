import type { Exercise } from '../../domain/exercise/types'
import type { ExerciseDetailsStatistics } from '../../domain/statistics/exercise-details'
import { formatMetric } from '../statistics/format'

function display(value: number | undefined, unit = ''): string {
  return value === undefined ? '—' : `${formatMetric(value)}${unit}`
}

export function ExerciseDetailMetrics({
  exercise,
  statistics,
}: {
  exercise: Exercise
  statistics: ExerciseDetailsStatistics
}) {
  const cardio = exercise.recordSchema.duration !== 'DISABLED'
  const cards = [
    {
      label: cardio ? '累计训练段数' : '累计训练组数',
      value: `${statistics.setCount} ${cardio ? '段' : '组'}`,
    },
  ]

  if (exercise.loadMode === 'EXTERNAL') {
    if (exercise.recordSchema.reps !== 'DISABLED') {
      cards.push({
        label: '最大训练重量',
        value: statistics.maxLoadPerformance
          ? `${display(statistics.maxLoadPerformance.load, ' kg')} × ${statistics.maxLoadPerformance.reps} 次`
          : '—',
      })
      cards.push({
        label: '最佳估算 1RM',
        value: display(statistics.estimatedOneRepMax, ' kg'),
      })
    } else {
      cards.push({ label: '最大训练重量', value: display(statistics.maxLoad, ' kg') })
    }
  } else if (exercise.loadMode === 'BODYWEIGHT_PLUS') {
    cards.push({ label: '最大额外负重', value: display(statistics.maxExtraLoad, ' kg') })
    cards.push({
      label: '自重最佳次数',
      value: display(statistics.bodyweightBestReps, ' 次'),
    })
  } else if (exercise.loadMode === 'ASSISTANCE') {
    cards.push({ label: '最小辅助重量', value: display(statistics.minAssistance, ' kg') })
    if (exercise.recordSchema.reps !== 'DISABLED') {
      cards.push({ label: '最佳次数', value: display(statistics.maxReps, ' 次') })
    }
  } else if (cardio) {
    cards.push({ label: '累计时长', value: display(statistics.totalDuration, ' 分钟') })
    if (exercise.recordSchema.distance !== 'DISABLED') {
      cards.push({ label: '累计距离', value: display(statistics.totalDistance, ' km') })
    }
    if (exercise.recordSchema.speed !== 'DISABLED') {
      cards.push({ label: '最高速度', value: display(statistics.maxSpeed, ' km/h') })
    }
    if (exercise.recordSchema.incline !== 'DISABLED') {
      cards.push({ label: '最高坡度', value: display(statistics.maxIncline) })
    }
  } else if (exercise.recordSchema.reps !== 'DISABLED') {
    cards.push({ label: '单组最高次数', value: display(statistics.maxReps, ' 次') })
  }

  return (
    <section aria-label="动作训练概览" className="exercise-detail-metrics">
      {cards.map((card) => (
        <article className="exercise-detail-metric" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  )
}
