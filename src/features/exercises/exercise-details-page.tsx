import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { statisticsService } from '../../application/statistics-service'
import { inferCategory, officialExerciseCategories } from '../../domain/exercise/category'
import type { Exercise } from '../../domain/exercise/types'
import type {
  DetailMetric,
  DetailRange,
  ExerciseDetailsStatistics,
} from '../../domain/statistics/exercise-details'
import { TopBar } from '../../shared/components/ui'
import { TrendChart } from '../statistics/trend-chart'
import { categoryLabel } from './exercise-category'
import { ExerciseDetailMetrics } from './exercise-detail-metrics'
import { getExerciseSummary } from './exercise-summary'

const rangeLabels: Record<DetailRange, string> = {
  week: '周',
  month: '月',
  all: '全部',
}

const metricLabels: Record<DetailMetric, { label: string; unit: string }> = {
  load: { label: '重量', unit: ' kg' },
  oneRepMax: { label: '估算 1RM', unit: ' kg' },
  extraLoad: { label: '额外负重', unit: ' kg' },
  assistance: { label: '辅助重量', unit: ' kg' },
  reps: { label: '次数', unit: ' 次' },
  duration: { label: '时长', unit: ' 分钟' },
  distance: { label: '距离', unit: ' km' },
  speed: { label: '速度', unit: ' km/h' },
  incline: { label: '坡度', unit: '' },
}

type DetailResult = { exercise: Exercise; statistics: ExerciseDetailsStatistics }

function localDate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function ExerciseDetailsPage() {
  const { exerciseId = '' } = useParams()
  const [referenceDate] = useState(localDate)
  const [details, setDetails] = useState<DetailResult>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [range, setRange] = useState<DetailRange>('month')
  const [metric, setMetric] = useState<DetailMetric>('load')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      void statisticsService
        .exerciseDetails(exerciseId, referenceDate)
        .then((result) => {
          if (active) {
            setDetails(result)
            setError(undefined)
            setLoading(false)
          }
        })
        .catch((reason: unknown) => {
          if (active) {
            setError(reason instanceof Error ? reason.message : '无法读取动作详情。')
            setLoading(false)
          }
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [exerciseId, referenceDate])

  if (loading || (details && details.exercise.id !== exerciseId)) {
    return (
      <section className="page" role="status">
        正在加载动作详情…
      </section>
    )
  }

  if (error || details === undefined) {
    return (
      <section className="page exercise-details-page">
        <TopBar backTo={<Link to="/exercises">返回动作列表</Link>} title="动作详情" />
        <p className="empty-state" role={error ? 'alert' : 'status'}>
          {error ?? '未找到该动作。'}
        </p>
      </section>
    )
  }

  const { exercise, statistics } = details
  const selectedMetric = statistics.availableMetrics.includes(metric)
    ? metric
    : statistics.availableMetrics[0]
  const trend = statistics.trends[range]
  const points = selectedMetric ? (trend.points[selectedMetric] ?? []) : []

  return (
    <section className="page exercise-details-page">
      <TopBar
        action={<Link to={`/exercises/${exercise.id}/edit`}>编辑</Link>}
        backTo={<Link to="/exercises">返回动作列表</Link>}
        title="动作详情"
      />

      <header className="exercise-detail-header">
        <div className="exercise-detail-header__title">
          <h2>{exercise.name}</h2>
          {exercise.archived && (
            <span className="exercise-detail-header__archived">已归档</span>
          )}
        </div>
        <p>
          {categoryLabel(
            exercise.category ??
              officialExerciseCategories[exercise.name] ??
              inferCategory(exercise.name),
          )}
        </p>
        <p>{getExerciseSummary(exercise.recordSchema, exercise.loadMode)}</p>
      </header>

      {statistics.recordCount === 0 ? (
        <p className="empty-state">还没有这个动作的训练记录。</p>
      ) : (
        <>
          <ExerciseDetailMetrics exercise={exercise} statistics={statistics} />
          {exercise.loadMode === 'ASSISTANCE' && (
            <p className="field-hint">辅助重量下降通常表示进步。</p>
          )}
          <section
            aria-label="动作趋势"
            className="statistics-section exercise-detail-trend"
          >
            <h2>{exercise.loadMode === 'EXTERNAL' ? '力量趋势' : '训练趋势'}</h2>
            <div aria-label="时间范围" className="exercise-detail-switch" role="group">
              {(['week', 'month', 'all'] as const).map((value) => (
                <button
                  aria-pressed={range === value}
                  key={value}
                  onClick={() => setRange(value)}
                  type="button"
                >
                  {rangeLabels[value]}
                </button>
              ))}
            </div>
            {statistics.availableMetrics.length > 1 && (
              <div aria-label="趋势指标" className="exercise-detail-switch" role="group">
                {statistics.availableMetrics.map((value) => (
                  <button
                    aria-pressed={selectedMetric === value}
                    key={value}
                    onClick={() => setMetric(value)}
                    type="button"
                  >
                    {metricLabels[value].label}
                  </button>
                ))}
              </div>
            )}
            {selectedMetric === undefined || points.length === 0 ? (
              <p className="field-hint">这一范围暂无可用数据。</p>
            ) : (
              <TrendChart
                domainEnd={trend.domainEnd}
                domainStart={trend.domainStart}
                key={`${exercise.id}-${range}-${selectedMetric}`}
                unit={metricLabels[selectedMetric].unit}
                values={points}
              />
            )}
          </section>
        </>
      )}
    </section>
  )
}
