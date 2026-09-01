import { NOMINATIM_USER_AGENT } from "@/lib/location/nominatim"

export type GeocodePlaceInput = {
  city?: string | null
  region?: string | null
  country?: string | null
}

export type GeocodeResult = {
  latitude: number
  longitude: number
}

type NominatimSearchResult = {
  lat?: string
  lon?: string
}

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"

function buildPlaceQuery(input: GeocodePlaceInput): string | null {
  const parts = [input.city, input.region, input.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(", ") : null
}

export async function geocodePlace(
  input: GeocodePlaceInput,
): Promise<GeocodeResult | null> {
  const query = buildPlaceQuery(input)
  if (!query) return null

  const url = new URL(NOMINATIM_SEARCH_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", "1")
  url.searchParams.set("addressdetails", "0")

  let response: Response
  try {
    response = await fetch(url.toString(), {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
      cache: "no-store",
    })
  } catch {
    return null
  }

  if (!response.ok) return null

  let results: NominatimSearchResult[]
  try {
    results = (await response.json()) as NominatimSearchResult[]
  } catch {
    return null
  }

  const match = results[0]
  if (!match?.lat || !match.lon) return null

  const latitude = Number.parseFloat(match.lat)
  const longitude = Number.parseFloat(match.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  return { latitude, longitude }
}
