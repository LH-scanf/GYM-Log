import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { statisticsService } from '../../application/statistics-service'
import type { Exercise } from '../../domain/exercise/types'
import type { ExerciseStatistics, TrendPoint } from '../../domain/statistics/statistics'
import { TrendChart } from './trend-chart'
import { formatMetric } from './format'

export function ExerciseStatisticsPage() {
  const { exerciseId = '' } = useParams()
  const [exercise, setExercise] = useState<Exercise>()
  const [statistics, setStatistics] = useState<ExerciseStatistics>()
  const [fixedLoad, setFixedLoad] = useState<number>()
  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([
        statisticsService.getExercise(exerciseId),
        statisticsService.exerciseStatistics(exerciseId),
      ]).then(([nextExercise, nextStatistics]) => {
        setExercise(nextExercise)
        setStatistics(nextStatistics)
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [exerciseId])
  if (!exercise || !statistics)
    return (
      <section className="page">
        <p role="status">正在加载动作统计…</p>
      </section>
    )
  return (
    <section className="page exercise-statistics-page">
      <Link className="text-link" to="/statistics">
        返回统计
      </Link>
      <p className="eyebrow">{exercise.archived ? '已归档动作' : '动作统计'}</p>
      <h1>{exercise.name}</h1>
      {statistics.trainingCount === 0 ? (
        <p className="empty-state">还没有这个动作的训练记录。</p>
      ) : (
        <>
          <section className="statistics-summary">
            <Metric label="训练次数" value={`${statistics.trainingCount} 次`} />
            <Metric label="记录数" value={`${statistics.recordCount} 组`} />
          </section>
          {exercise.loadMode === 'EXTERNAL' && (
            <>
              <MetricSection label="最大负重" value={weight(statistics.maxLoad)} />
              <MetricSection
                label="估算 1RM（Epley）"
                value={weight(statistics.estimatedOneRepMax)}
              />
              <Trend
                title="估算 1RM 趋势"
                values={statistics.estimatedOneRepMaxTrend}
                unit=" kg"
              />
              <Trend title="每次训练最大负重" values={statistics.loadTrend} unit=" kg" />
              <FixedLoadTrend
                statistics={statistics}
                fixedLoad={fixedLoad}
                setFixedLoad={setFixedLoad}
              />
            </>
          )}
          {exercise.loadMode === 'BODYWEIGHT_PLUS' && (
            <>
              <MetricSection label="最大额外负重" value={weight(statistics.maxLoad)} />
              <Trend
                title="自重时每次最佳次数"
                values={statistics.bodyweightRepsTrend}
                unit=" 次"
              />
              <FixedLoadTrend
                statistics={statistics}
                fixedLoad={fixedLoad}
                setFixedLoad={setFixedLoad}
                label="指定额外负重的最佳次数"
              />
            </>
          )}
          {exercise.loadMode === 'ASSISTANCE' && (
            <>
              <MetricSection
                label="最小辅助重量"
                value={weight(statistics.minAssistance)}
              />
              <p className="field-hint">辅助重量下降通常表示进步；此类动作不计算 1RM。</p>
              <Trend
                title="每次训练最小辅助重量"
                values={statistics.loadTrend}
                unit=" kg"
              />
              <FixedLoadTrend
                statistics={statistics}
                fixedLoad={fixedLoad}
                setFixedLoad={setFixedLoad}
                label="指定辅助重量的最佳次数"
              />
            </>
          )}
          {exercise.loadMode === 'NONE' &&
            exercise.recordSchema.duration === 'DISABLED' && (
              <>
                <MetricSection
                  label="单组最高次数"
                  value={
                    statistics.maxReps === undefined ? '—' : `${statistics.maxReps} 次`
                  }
                />
                <Trend
                  title="每次训练最佳次数"
                  values={statistics.repsTrend}
                  unit=" 次"
                />
              </>
            )}
          {exercise.recordSchema.duration !== 'DISABLED' && (
            <>
              <MetricSection
                label="累计时长"
                value={`${statistics.totalDuration ?? 0} 分钟`}
              />
              <MetricSection
                label="单次最长时长"
                value={`${statistics.longestDuration ?? 0} 分钟`}
              />
              <MetricSection
                label="累计距离"
                value={`${statistics.totalDistance ?? 0} km`}
              />
              <Trend
                title="每次训练时长"
                values={statistics.durationTrend}
                unit=" 分钟"
              />
              <Trend title="每次训练距离" values={statistics.distanceTrend} unit=" km" />
              {statistics.speedTrend.length > 0 && (
                <Trend
                  title="每次训练最高速度"
                  values={statistics.speedTrend}
                  unit=" km/h"
                />
              )}
              {statistics.inclineTrend.length > 0 && (
                <Trend
                  title="每次训练最高坡度"
                  values={statistics.inclineTrend}
                  unit=""
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

function weight(value: number | undefined) {
  return value === undefined ? '—' : `${formatMetric(value)} kg`
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
function MetricSection({ label, value }: { label: string; value: string }) {
  return (
    <section className="statistics-section">
      <h2>{label}</h2>
      <p className="metric-value">{value}</p>
    </section>
  )
}
function Trend({
  title,
  values,
  unit,
}: {
  title: string
  values: TrendPoint[]
  unit: string
}) {
  return (
    <section className="statistics-section">
      <h2>{title}</h2>
      {values.length === 0 ? (
        <p className="field-hint">暂无可用数据。</p>
      ) : (
        <TrendChart values={values} unit={unit} />
      )}
    </section>
  )
}

function FixedLoadTrend({
  statistics,
  fixedLoad,
  setFixedLoad,
  label = '指定负重的最佳次数',
}: {
  statistics: ExerciseStatistics
  fixedLoad: number | undefined
  setFixedLoad: (value: number) => void
  label?: string
}) {
  if (statistics.fixedLoads.length === 0) return null
  const selected = fixedLoad ?? statistics.fixedLoads[0]
  return (
    <section className="statistics-section">
      <h2>{label}</h2>
      <div className="filter-buttons">
        {statistics.fixedLoads.map((load) => (
          <button
            key={load}
            className={selected === load ? 'primary-button' : 'quiet-button'}
            onClick={() => setFixedLoad(load)}
          >
            {load} kg
          </button>
        ))}
      </div>
      <Trend
        title={`${selected} kg 趋势`}
        values={statistics.fixedLoadReps(selected)}
        unit=" 次"
      />
    </section>
  )
}
