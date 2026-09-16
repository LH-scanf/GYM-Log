/**
 * 统计数值格式化。
 *
 * 1RM 是 `load × (1 + reps / 30)` 算出来的，直接渲染会带出
 * `50.66666666666664 kg` 这种长尾；统计页只展示到 0.1 kg。
 */
export function formatMetric(value: number): string {
  return String(Math.round(value * 10) / 10)
}
