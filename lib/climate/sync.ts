import type { ClimateBand } from "@/generated/prisma/client"

type OpenMeteoCurrent = {
  current?: {
    temperature_2m?: number
    relative_humidity_2m?: number
    uv_index?: number
  }
}

export type ClimateSnapshot = {
  uvIndexBand: ClimateBand
  humidityBand: ClimateBand
  temperatureBand: ClimateBand
  climateZone: string
  seasonBand: string
}

function bandFromUv(uv: number): ClimateBand {
  if (uv < 3) return "low"
  if (uv < 6) return "moderate"
  if (uv < 8) return "high"
  return "extreme"
}

function bandFromHumidity(humidity: number): ClimateBand {
  if (humidity < 35) return "low"
  if (humidity < 60) return "moderate"
  if (humidity < 75) return "high"
  return "extreme"
}

function bandFromTemp(celsius: number): ClimateBand {
  if (celsius < 10) return "low"
  if (celsius < 22) return "moderate"
  if (celsius < 30) return "high"
  return "extreme"
}

function inferClimateZone(humidity: number, temp: number): string {
  if (humidity >= 65 && temp >= 20) return "humid_subtropical"
  if (humidity < 35 && temp >= 18) return "arid"
  if (temp < 10) return "cold"
  if (humidity >= 55) return "temperate_humid"
  return "temperate"
}

function seasonBandForLat(latitude: number): string {
  const month = new Date().getMonth() + 1
  const southern = latitude < 0
  const effectiveMonth = southern ? ((month + 5) % 12) + 1 : month
  if (effectiveMonth >= 3 && effectiveMonth <= 5) return "spring"
  if (effectiveMonth >= 6 && effectiveMonth <= 8) return "summer"
  if (effectiveMonth >= 9 && effectiveMonth <= 11) return "autumn"
  return "winter"
}

export async function fetchClimateSnapshot(
  latitude: number,
  longitude: number
): Promise<ClimateSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(latitude))
  url.searchParams.set("longitude", String(longitude))
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,uv_index")
  url.searchParams.set("timezone", "auto")

  const response = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!response.ok) {
    throw new Error("Failed to fetch climate data")
  }

  const data = (await response.json()) as OpenMeteoCurrent
  const temp = data.current?.temperature_2m ?? 20
  const humidity = data.current?.relative_humidity_2m ?? 50
  const uv = data.current?.uv_index ?? 3

  return {
    uvIndexBand: bandFromUv(uv),
    humidityBand: bandFromHumidity(humidity),
    temperatureBand: bandFromTemp(temp),
    climateZone: inferClimateZone(humidity, temp),
    seasonBand: seasonBandForLat(latitude),
  }
}

const SYNC_TTL_MS = 6 * 60 * 60 * 1000

export function shouldSyncClimate(lastSyncedAt: Date | null | undefined): boolean {
  if (!lastSyncedAt) return true
  return Date.now() - lastSyncedAt.getTime() > SYNC_TTL_MS
}
