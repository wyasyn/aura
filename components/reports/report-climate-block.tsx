import Link from "next/link"

import {
  formatClimateBand,
  formatClimateZone,
  formatLocationLabel,
  formatSeasonBand,
} from "@/lib/scan/format"
import type { ScanClimateContext } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ReportClimateBlockProps = {
  climateContext: ScanClimateContext | null
  className?: string
}

function ClimateMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function ReportClimateBlock({
  climateContext,
  className,
}: ReportClimateBlockProps) {
  const locationLabel = climateContext
    ? formatLocationLabel(climateContext)
    : ""

  const hasClimateBands =
    climateContext?.uvIndexBand != null ||
    climateContext?.humidityBand != null ||
    climateContext?.temperatureBand != null

  if (!climateContext || (!locationLabel && !hasClimateBands)) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Climate data wasn&apos;t available for this scan. Add your location in{" "}
        <Link
          href="/dashboard/profile"
          className="text-foreground underline underline-offset-4"
        >
          profile settings
        </Link>{" "}
        for weather-aware recommendations.
      </p>
    )
  }

  return (
    <div className={cn("font-sans space-y-3", className)}>
      {locationLabel ? (
        <p className="text-sm text-foreground">{locationLabel}</p>
      ) : null}

      {hasClimateBands ? (
        <div className="grid gap-px overflow-hidden rounded-sm border border-border sm:grid-cols-2">
          <ClimateMetric
            label="UV exposure"
            value={formatClimateBand(climateContext.uvIndexBand)}
          />
          <ClimateMetric
            label="Humidity"
            value={formatClimateBand(climateContext.humidityBand)}
          />
          <ClimateMetric
            label="Temperature"
            value={formatClimateBand(climateContext.temperatureBand)}
          />
          <ClimateMetric
            label="Climate zone"
            value={formatClimateZone(climateContext.climateZone)}
          />
        </div>
      ) : null}

      {climateContext.seasonBand ? (
        <p className="text-xs text-muted-foreground">
          Season: {formatSeasonBand(climateContext.seasonBand)}
          {climateContext.syncedAt
            ? ` · Synced ${new Date(climateContext.syncedAt).toLocaleString()}`
            : null}
        </p>
      ) : null}
    </div>
  )
}
