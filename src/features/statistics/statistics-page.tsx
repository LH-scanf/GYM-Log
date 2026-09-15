import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { statisticsService } from '../../application/statistics-service'
import type { Exercise } from '../../domain/exercise/types'
import type { HeatmapDay, OverviewStatistics } from '../../domain/statistics/statistics'
import type { WorkoutSession } from '../../domain/workout/types'
import { formatDuration } from '../workouts/workout-format'
import { EmptyState, TopBar } from '../../shared/components/ui'

function localDate() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function StatisticsPage() {
  const today = localDate()
  const [overview, setOverview] = useState<OverviewStatistics>()
  const [days, setDays] = useState<HeatmapDay[]>([])
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const [selectedDate, setSelectedDate] = useState<string>()
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([
        statisticsService.overview(today),
        statisticsService.listExercises(),
        statisticsService.availableYears(),
      ]).then(([nextOverview, nextExercises, nextYears]) => {
        setOverview(nextOverview)
        setExercises(nextExercises)
        setAvailableYears(nextYears)
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [today])
  useEffect(() => {
    const timer = setTimeout(() => void statisticsService.heatmap(year).then(setDays), 0)
    return () => clearTimeout(timer)
  }, [year])
  const matchedExercises = exercises.filter((exercise) =>
    exercise.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const heatmapDays = [...days].sort((left, right) => {
    const leftDate = new Date(`${left.date}T00:00:00Z`)
    const rightDate = new Date(`${right.date}T00:00:00Z`)
    const leftWeek = Math.floor(
      (Date.UTC(
        leftDate.getUTCFullYear(),
        leftDate.getUTCMonth(),
        leftDate.getUTCDate(),
      ) -
        Date.UTC(leftDate.getUTCFullYear(), 0, 1) +
        new Date(`${leftDate.getUTCFullYear()}-01-01T00:00:00Z`).getUTCDay() *
          86_400_000) /
        (7 * 86_400_000),
    )
    const rightWeek = Math.floor(
      (Date.UTC(
        rightDate.getUTCFullYear(),
        rightDate.getUTCMonth(),
        rightDate.getUTCDate(),
      ) -
        Date.UTC(rightDate.getUTCFullYear(), 0, 1) +
        new Date(`${rightDate.getUTCFullYear()}-01-01T00:00:00Z`).getUTCDay() *
          86_400_000) /
        (7 * 86_400_000),
    )
    return leftDate.getUTCDay() - rightDate.getUTCDay() || leftWeek - rightWeek
  })
  async function selectDay(date: string) {
    setSelectedDate(date)
    setSessions(await statisticsService.sessionsOn(date))
  }
  return (
    <section className="page statistics-page">
      <TopBar title="统计" />
      <p className="eyebrow">从本地训练记录实时计算</p>
      {!overview ? (
        <p role="status">正在计算统计…</p>
      ) : (
        <section className="statistics-summary" aria-label="训练概览">
          <SummaryCard
            label={`${today.slice(0, 4)} 年训练次数`}
            value={`${overview.year.count} 次`}
          />
          <SummaryCard
            label={`${today.slice(0, 4)} 年训练时长`}
            value={formatDuration(overview.year.duration)}
          />
          <SummaryCard
            label={`${today.slice(0, 7)} 训练次数`}
            value={`${overview.month.count} 次`}
          />
          <SummaryCard
            label={`${today.slice(0, 7)} 训练时长`}
            value={formatDuration(overview.month.duration)}
          />
        </section>
      )}
      <section className="statistics-section">
        <div className="page-heading">
          <h2>训练日历</h2>
          <select
            aria-label="统计年份"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {[...new Set([Number(today.slice(0, 4)), ...availableYears])]
              .sort((a, b) => b - a)
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </div>
        <p className="field-hint">有训练的日期已高亮。点击日期查看当日训练。</p>
        {days.some((day) => day.active) && (
          <div className="active-day-list" aria-label="有训练的日期">
            {days
              .filter((day) => day.active)
              .map((day) => (
                <button
                  key={day.date}
                  className="quiet-button"
                  onClick={() => void selectDay(day.date)}
                >
                  {day.date} · {day.count} 次
                </button>
              ))}
          </div>
        )}
        {selectedDate && (
          <section className="exercise-group" aria-live="polite">
            <h3>{selectedDate} 的训练</h3>
            {sessions.length === 0 ? (
              <p>当天没有训练。</p>
            ) : (
              <ul className="exercise-list">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Link className="exercise-row__main" to={`/workouts/${session.id}`}>
                      <strong>{session.startTime ?? '未填写开始时间'} 的训练</strong>
                      <span>查看训练详情</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <div className="heatmap" aria-label={`${year} 年训练日历`}>
          {heatmapDays.map((day) => (
            <div
              key={day.date}
              className={day.active ? 'heatmap-day heatmap-day--active' : 'heatmap-day'}
              aria-label={`${day.date}${day.active ? `，${day.count} 次训练` : '，无训练'}`}
            >
              {day.date.slice(-2)}
            </div>
          ))}
        </div>
      </section>
      <section className="statistics-section">
        <h2>动作统计</h2>
        <label className="search-field">
          搜索动作
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入动作名称"
          />
        </label>
        {matchedExercises.length === 0 ? (
          <EmptyState title="没有匹配的动作" />
        ) : (
          <ul className="exercise-list statistics-exercises">
            {matchedExercises.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  className="exercise-row__main"
                  to={`/statistics/exercises/${exercise.id}`}
                >
                  <strong>{exercise.name}</strong>
                  <span>{exercise.archived ? '已归档 · ' : ''}查看统计</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
