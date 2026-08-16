import type { ScanClimateContext } from "@/lib/scan/types"

export type LocationClimateFields = {
  city?: string | null
  region?: string | null
  country?: string | null
  uvIndexBand?: string | null
  humidityBand?: string | null
  temperatureBand?: string | null
  climateZone?: string | null
  seasonBand?: string | null
  lastSyncedAt?: Date | null
}

export function toScanClimateContext(
  location: LocationClimateFields | null,
): ScanClimateContext | null {
  if (!location) return null

  const hasClimate =
    location.uvIndexBand != null ||
    location.humidityBand != null ||
    location.temperatureBand != null ||
    location.climateZone != null ||
    location.seasonBand != null

  const hasPlace =
    Boolean(location.city) ||
    Boolean(location.region) ||
    Boolean(location.country)

  if (!hasClimate && !hasPlace) return null

  return {
    city: location.city ?? null,
    region: location.region ?? null,
    country: location.country ?? null,
    uvIndexBand: location.uvIndexBand ?? null,
    humidityBand: location.humidityBand ?? null,
    temperatureBand: location.temperatureBand ?? null,
    climateZone: location.climateZone ?? null,
    seasonBand: location.seasonBand ?? null,
    syncedAt: location.lastSyncedAt?.toISOString() ?? null,
  }
}

export function toLocationSnapshot(location: LocationClimateFields | null) {
  const context = toScanClimateContext(location)
  if (!context) return undefined

  return {
    city: context.city,
    region: context.region,
    country: context.country,
    uvIndexBand: context.uvIndexBand,
    humidityBand: context.humidityBand,
    temperatureBand: context.temperatureBand,
    climateZone: context.climateZone,
    seasonBand: context.seasonBand,
    syncedAt: context.syncedAt,
  }
}

export function parseLocationSnapshot(
  value: unknown,
): ScanClimateContext | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  return {
    city: typeof record.city === "string" ? record.city : null,
    region: typeof record.region === "string" ? record.region : null,
    country: typeof record.country === "string" ? record.country : null,
    uvIndexBand:
      typeof record.uvIndexBand === "string" ? record.uvIndexBand : null,
    humidityBand:
      typeof record.humidityBand === "string" ? record.humidityBand : null,
    temperatureBand:
      typeof record.temperatureBand === "string"
        ? record.temperatureBand
        : null,
    climateZone:
      typeof record.climateZone === "string" ? record.climateZone : null,
    seasonBand:
      typeof record.seasonBand === "string" ? record.seasonBand : null,
    syncedAt: typeof record.syncedAt === "string" ? record.syncedAt : null,
  }
}
