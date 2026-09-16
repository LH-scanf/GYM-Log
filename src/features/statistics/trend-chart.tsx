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
}: {
  values: TrendPoint[]
  unit: string
  compact?: boolean
}) {
  // 默认停在最新一次采样上——打开统计页的人想知道的是"现在多少"。
  const [selected, setSelected] = useState(() => Math.max(0, values.length - 1))
  const low = Math.min(...values.map((point) => point.value))
  const high = Math.max(...values.map((point) => point.value))
  const range = high - low || 1
  const coordinates = values.map((point, index) => ({
    x: values.length === 1 ? 50 : 5 + (90 * index) / (values.length - 1),
    y: 90 - ((point.value - low) / range) * 80,
  }))
  const point = values[selected] ?? values[0]
  const label = (item: TrendPoint) => `${item.date}：${formatMetric(item.value)}${unit}`
  return (
    <>
      <div className={`trend-chart${compact ? ' trend-chart--compact' : ''}`}>
        <svg viewBox="0 0 100 100" role="img" aria-label={label(point)}>
          <polyline
            points={coordinates.map((item) => `${item.x},${item.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          {coordinates.map((item, index) =>
            compact ? (
              <circle
                aria-label={label(values[index])}
                className={`trend-point${selected === index ? ' trend-point--active' : ''}`}
                cx={item.x}
                cy={item.y}
                key={index}
                onClick={() => setSelected(index)}
                r="3"
                role="button"
                tabIndex={0}
              />
            ) : (
              <circle key={index} cx={item.x} cy={item.y} r="3" />
            ),
          )}
        </svg>
        {!compact && (
          <div className="filter-buttons" aria-label="趋势数据点">
            {values.map((item, index) => (
              <button
                key={`${item.date}-${index}`}
                className={selected === index ? 'primary-button' : 'quiet-button'}
                onClick={() => setSelected(index)}
              >
                {item.date.slice(5)}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="trend-tooltip" role="status">
        {point.date}：
        <strong>
          {formatMetric(point.value)}
          {unit}
        </strong>
      </p>
    </>
  )
}
