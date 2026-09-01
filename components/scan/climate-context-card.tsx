import Link from "next/link"
import { IconCloud } from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatClimateBand,
  formatClimateZone,
  formatLocationLabel,
  formatSeasonBand,
} from "@/lib/scan/format"
import type { ScanClimateContext } from "@/lib/scan/types"

type ClimateContextCardProps = {
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
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function ClimateContextCard({
  climateContext,
  className,
}: ClimateContextCardProps) {
  const locationLabel = climateContext
    ? formatLocationLabel(climateContext)
    : ""

  const hasClimateBands =
    climateContext?.uvIndexBand != null ||
    climateContext?.humidityBand != null ||
    climateContext?.temperatureBand != null

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <IconCloud className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium normal-case tracking-normal text-foreground">
            Your local weather
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!climateContext || (!locationLabel && !hasClimateBands) ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Climate data wasn&apos;t available for this scan. Add your location
            in{" "}
            <Link
              href="/dashboard/profile"
              className="text-foreground underline underline-offset-4"
            >
              profile settings
            </Link>{" "}
            for weather-aware recommendations.
          </p>
        ) : (
          <>
            {locationLabel ? (
              <p className="text-sm text-foreground">{locationLabel}</p>
            ) : null}
            {hasClimateBands ? (
              <div className="grid gap-2 sm:grid-cols-2">
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
            ) : locationLabel ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Weather bands could not be resolved for this location. Check the
                city and country in{" "}
                <Link
                  href="/dashboard/profile"
                  className="text-foreground underline underline-offset-4"
                >
                  profile settings
                </Link>
                .
              </p>
            ) : null}
            {climateContext.climateZone || climateContext.seasonBand ? (
              <p className="text-xs text-muted-foreground">
                {climateContext.seasonBand
                  ? `Season: ${formatSeasonBand(climateContext.seasonBand)}`
                  : null}
                {climateContext.seasonBand && climateContext.syncedAt
                  ? " · "
                  : null}
                {climateContext.syncedAt
                  ? `Synced ${new Date(climateContext.syncedAt).toLocaleString()}`
                  : null}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
