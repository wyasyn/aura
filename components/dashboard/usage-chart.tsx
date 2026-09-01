"use client"

import { IconChartBar } from "@tabler/icons-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { DashboardEmptyState } from "@/components/dashboard/dashboard-card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCompactNumber } from "@/lib/format/compact-number"

const CHART_MARGIN = { top: 8, right: 8, left: 12, bottom: 0 }

const yAxisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  width: 48,
  className: "text-xs fill-muted-foreground",
} as const

export function UsageBarChart({
  data,
  label = "Scans",
}: {
  data: { label: string; value: number }[]
  label?: string
}) {
  const config = {
    value: { label, color: "var(--chart-1)" },
  } satisfies ChartConfig

  if (data.every((d) => d.value === 0)) {
    return (
      <DashboardEmptyState
        icon={IconChartBar}
        title="No usage data yet"
        description="Your daily scan activity will appear here once you save a scan."
        className="h-48"
      />
    )
  }

  return (
    <ChartContainer config={config} className="h-48 w-full min-w-0">
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs fill-muted-foreground"
        />
        <YAxis {...yAxisProps} tickFormatter={(value) => formatCompactNumber(value)} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

export function RoleDistributionChart({
  data,
}: {
  data: { role: string; count: number }[]
}) {
  const config = {
    count: { label: "Users", color: "var(--chart-2)" },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-48 w-full min-w-0">
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="role"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs fill-muted-foreground"
        />
        <YAxis {...yAxisProps} tickFormatter={(value) => formatCompactNumber(value)} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
