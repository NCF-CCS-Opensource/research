import type { DashboardMetric } from "@/types/api"

export function comparisonLabel(
  current: number,
  previous: number,
  period: 30 | 90
) {
  if (!previous) return current ? "New activity" : "No activity"
  const change = Math.round(((current - previous) / previous) * 100)
  return `${change > 0 ? "+" : ""}${change}% vs prior ${period} days`
}

export function chartPoints(
  days: Array<{ date: string } & Record<DashboardMetric, number>>,
  metric: DashboardMetric,
  width = 720,
  height = 220
) {
  const maximum = Math.max(1, ...days.map((day) => day[metric]))
  const steps = Math.max(1, days.length - 1)
  return days
    .map(
      (day, index) =>
        `${(index / steps) * width},${height - (day[metric] / maximum) * height}`
    )
    .join(" ")
}
