import { useState } from 'react'
import type { TrendPoint } from '../../domain/statistics/statistics'
import { formatMetric } from './format'

/**
 * 趋势折线图。
 *
 * - 默认（`compact=false`）：折线下方给每个数据点一个可点按钮，适合动作统计页这种
 *   「一眼看全部采样日」的场景。
 * - `compact=true`：不渲染按钮列表，直接在折线圆点上点选，适合统计页趋势卡这种
 *   空间受限、又不想让按钮把卡片撑长的场景。
 */
export function TrendChart({
  values,
  unit,
  compact = false,
  domainStart,
  domainEnd,
}: {
  values: TrendPoint[]
  unit: string
  compact?: boolean
  domainStart?: string
  domainEnd?: string
}) {
  // 默认停在最新一次采样上——打开统计页的人想知道的是"现在多少"。
  const [selected, setSelected] = useState(() => Math.max(0, values.length - 1))
  if (values.length === 0) return <p className="field-hint">暂无可用数据。</p>

  const low = Math.min(...values.map((point) => point.value))
  const high = Math.max(...values.map((point) => point.value))
  const valueRange = high - low || 1
  const start = Date.parse(`${domainStart ?? values[0].date}T00:00:00Z`)
  const end = Date.parse(`${domainEnd ?? values.at(-1)?.date}T00:00:00Z`)
  const dateRange = end - start
  const coordinates = values.map((point, index) => ({
    x:
      dateRange === 0
        ? 50
        : 10 + (80 * (Date.parse(`${point.date}T00:00:00Z`) - start)) / dateRange,
    y: high === low ? 25 : 40 - ((point.value - low) / valueRange) * 30,
    index,
  }))
  const active = Math.min(selected, values.length - 1)
  const point = values[active]
  const dateLabel = (item: TrendPoint) =>
    item.endDate && item.endDate !== item.date
      ? `${item.date} 至 ${item.endDate}`
      : item.date
  const label = (item: TrendPoint) =>
    `${dateLabel(item)}：${formatMetric(item.value)}${unit}`
  return (
    <>
      <div className={`trend-chart${compact ? ' trend-chart--compact' : ''}`}>
        <svg
          aria-label="趋势数据点"
          preserveAspectRatio="none"
          role="group"
          viewBox="0 0 100 50"
        >
          <polyline
            points={coordinates.map((item) => `${item.x},${item.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
          />
          {coordinates.map((item) => (
            <g key={`${values[item.index].date}-${item.index}`}>
              <circle
                className={`trend-point${active === item.index ? ' trend-point--active' : ''}`}
                cx={item.x}
                cy={item.y}
                r="1.5"
              />
              <circle
                aria-label={label(values[item.index])}
                className="trend-point-hit"
                cx={item.x}
                cy={item.y}
                onClick={() => setSelected(item.index)}
                onFocus={() => setSelected(item.index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelected(item.index)
                  }
                }}
                r="9"
                role="button"
                tabIndex={0}
              />
            </g>
          ))}
        </svg>
        {!compact && (
          <div aria-label="趋势日期" className="trend-chart__point-list" role="group">
            {values.map((item, index) => (
              <button
                aria-pressed={active === index}
                className="trend-chart__point-button"
                key={`${item.date}-${index}`}
                onClick={() => setSelected(index)}
                type="button"
              >
                {item.endDate
                  ? `${item.date.slice(5)}–${item.endDate.slice(5)}`
                  : item.date.slice(5)}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="trend-tooltip" role="status">
        {dateLabel(point)}：
        <strong>
          {formatMetric(point.value)}
          {unit}
        </strong>
      </p>
    </>
  )
}
