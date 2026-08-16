"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { MAX_BAND_SCORE } from "@/lib/scan/dimension-chart-geometry"
import { bandToScore } from "@/lib/scan/band-score"
import { formatBand } from "@/lib/scan/format"
import type { AssessmentBand, SkinDimension } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type DimensionRadarChartProps = {
  dimensions: SkinDimension[]
  className?: string
  variant?: "app" | "document"
}

const config = {
  score: { label: "Band level", color: "var(--chart-1)" },
} satisfies ChartConfig

export function DimensionRadarChart({
  dimensions,
  className,
  variant = "document",
}: DimensionRadarChartProps) {
  const data = dimensions.map((dimension) => ({
    axis: dimension.label,
    score: bandToScore(dimension.band),
    band: dimension.band,
  }))

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-48 items-center justify-center text-sm text-muted-foreground",
          variant === "app" &&
            "rounded-xl border border-dashed border-border",
          className,
        )}
      >
        No dimension data for this scan
      </div>
    )
  }

  const isDocument = variant === "document"

  return (
    <ChartContainer
      config={config}
      className={cn(
        "mx-auto aspect-square w-full font-sans",
        isDocument ? "max-h-[220px]" : "max-h-[250px]",
        className,
      )}
    >
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="78%">
        {!isDocument ? (
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const band = (item.payload as { band?: AssessmentBand }).band
                  return band
                    ? `${formatBand(band)} (${value}/${MAX_BAND_SCORE})`
                    : String(value)
                }}
              />
            }
          />
        ) : null}
        <PolarGrid
          stroke="var(--border)"
          strokeOpacity={0.8}
          gridType="polygon"
        />
        <PolarAngleAxis
          dataKey="axis"
          tick={{
            fontSize: 11,
            fill: "var(--muted-foreground)",
            fontFamily: "var(--font-sans)",
          }}
        />
        <PolarRadiusAxis
          domain={[0, MAX_BAND_SCORE]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name="score"
          dataKey="score"
          fill="var(--color-score)"
          fillOpacity={isDocument ? 0.22 : 0.6}
          stroke="var(--color-score)"
          strokeWidth={isDocument ? 1.5 : 2}
          dot={isDocument ? false : { r: 4, fillOpacity: 1, fill: "var(--color-score)" }}
        />
      </RadarChart>
    </ChartContainer>
  )
}
