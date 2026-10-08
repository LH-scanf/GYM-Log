import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { statisticsService } from '../../application/statistics-service'
import type { HeatmapDay, OverviewStatistics } from '../../domain/statistics/statistics'
import type { WorkoutSession } from '../../domain/workout/types'
import { formatDuration } from '../workouts/workout-format'
import { AppIcon, PageHeader } from '../../shared/components/ui'

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
  const [availableYears, setAvailableYears] = useState<number[]>([])
  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([
        statisticsService.overview(today),
        statisticsService.availableYears(),
      ]).then(([nextOverview, nextYears]) => {
        setOverview(nextOverview)
        setAvailableYears(nextYears)
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [today])
  useEffect(() => {
    const timer = setTimeout(() => void statisticsService.heatmap(year).then(setDays), 0)
    return () => clearTimeout(timer)
  }, [year])
  const years = [...new Set([Number(today.slice(0, 4)), ...availableYears])].sort(
    (left, right) => right - left,
  )
  async function selectDay(date: string) {
    setSelectedDate(date)
    setSessions(await statisticsService.sessionsOn(date))
  }
  return (
    <section className="page statistics-page">
      <PageHeader
        title="统计"
        action={
          <select
            aria-label="统计年份"
            className="select-pill"
            onChange={(event) => setYear(Number(event.target.value))}
            value={year}
          >
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        }
      />
      {!overview ? (
        <p role="status">正在计算统计…</p>
      ) : (
        <section className="statistics-summary" aria-label="训练概览">
          <MetricCard
            icon="statistics"
            label="今年训练次数"
            tone="year-count"
            value={`${overview.year.count} 次`}
          />
          <MetricCard
            icon="clock"
            label="今年训练时长"
            tone="year-duration"
            value={formatDuration(overview.year.duration)}
          />
          <MetricCard
            icon="statistics"
            label="本月训练次数"
            tone="month-count"
            value={`${overview.month.count} 次`}
          />
          <MetricCard
            icon="clock"
            label="本月训练时长"
            tone="month-duration"
            value={formatDuration(overview.month.duration)}
          />
        </section>
      )}
      <section className="statistics-section">
        <h2>年度训练热力图</h2>
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
        <ContributionHeatmap days={days} onSelect={selectDay} year={year} />
      </section>
    </section>
  )
}

function ContributionHeatmap({
  days,
  year,
  onSelect,
}: {
  days: HeatmapDay[]
  year: number
  onSelect: (date: string) => Promise<void>
}) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const start = new Date(Date.UTC(year, 0, 1))
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())
  const cells = Array.from({ length: 53 * 7 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    const key = date.toISOString().slice(0, 10)
    return { date: key, day: byDate.get(key), inYear: date.getUTCFullYear() === year }
  })
  // 月份刻度：11px 的列宽塞不下「1月」，所以标签显式横跨 4 周，
  // 靠 grid-column 定位对齐到该月第一周，而不是让它自己折行。
  const monthLabels = Array.from({ length: 53 }, (_, week) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + week * 7)
    return date.getUTCDate() <= 7 && date.getUTCFullYear() === year
      ? { week, label: `${date.getUTCMonth() + 1}月` }
      : undefined
  }).flatMap((item) => (item === undefined ? [] : [item]))
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return (
    <div className="heatmap" aria-label={`${year} 年训练热力图`}>
      <div className="heatmap-months" aria-hidden="true">
        <span className="heatmap-months__spacer" />
        {monthLabels.map((item) => (
          <span
            className="heatmap-months__label"
            key={item.week}
            style={{ gridColumn: `${item.week + 2} / span 4` }}
          >
            {item.label}
          </span>
        ))}
      </div>
      <div aria-label="有训练的日期" className="heatmap-grid">
        {weekdays.map((name, weekday) => (
          <>
            <span className="heatmap-weekday" key={name}>
              {weekday % 2 === 1 ? name : ''}
            </span>
            {Array.from({ length: 53 }, (_, week) => {
              const cell = cells[week * 7 + weekday]
              const active = cell.day?.active === true
              return active ? (
                <button
                  aria-label={`${cell.date} · ${cell.day?.count} 次`}
                  className="heatmap-day heatmap-day--active"
                  key={cell.date}
                  onClick={() => void onSelect(cell.date)}
                  type="button"
                />
              ) : (
                <span
                  aria-label={`${cell.date}，无训练`}
                  className="heatmap-day"
                  key={cell.date}
                />
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

function MetricCard({
  tone,
  icon,
  label,
  value,
}: {
  tone: 'year-count' | 'year-duration' | 'month-count' | 'month-duration'
  icon: 'statistics' | 'clock'
  label: string
  value: string
}) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span className="metric-card__icon">
        <AppIcon name={icon} size={16} />
      </span>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
    </article>
  )
}
