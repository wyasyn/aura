"use client"

import { IconChartLine } from "@tabler/icons-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { DashboardEmptyState } from "@/components/dashboard/dashboard-card"
import type { ScanTrendPoint } from "@/lib/dashboard/scan-trends"

/** Matches the h-56 wrapper below so the first paint has real dimensions. */
const TREND_INITIAL_DIMENSION = { width: 320, height: 224 } as const

const BAND_SCORE: Record<string, number> = {
  minimal: 1,
  mild: 2,
  moderate: 3,
  elevated: 4,
  not_assessed: 0,
}

type SkinTrendChartProps = {
  points: ScanTrendPoint[]
}

export function SkinTrendChart({ points }: SkinTrendChartProps) {
  const data = points.map((point) => ({
    label: new Date(point.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    score: BAND_SCORE[String(point.overallBand)] ?? 0,
    band: String(point.overallBand).replace(/_/g, " "),
  }))

  if (data.length < 2) {
    return (
      <DashboardEmptyState
        icon={IconChartLine}
        title="Not enough scans yet"
        description="Complete at least two scans to see how your skin changes over time."
        className="h-56"
      />
    )
  }

  return (
    <div className="h-56 w-full min-w-0">
      {/*
        Recharts measures the parent on mount and warns about a -1 x -1 chart
        when it renders before layout settles. Seeding the dimensions matches
        what ChartContainer does for every other chart in the app.
      */}
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={TREND_INITIAL_DIMENSION}
      >
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            domain={[0, 4]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(value) => {
              const labels = ["", "Minimal", "Mild", "Moderate", "Elevated"]
              return labels[value] ?? ""
            }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(_value, _name, item) => [
              item.payload.band,
              "Overall band",
            ]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
