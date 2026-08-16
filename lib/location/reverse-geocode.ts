export type ReverseGeocodeResult = {
  city: string
  region: string
  country: string
}

type NominatimAddress = {
  city?: string
  town?: string
  village?: string
  municipality?: string
  suburb?: string
  hamlet?: string
  locality?: string
  county?: string
  state?: string
  region?: string
  state_district?: string
  country?: string
}

type NominatimResponse = {
  address?: NominatimAddress
  display_name?: string
}

import { NOMINATIM_USER_AGENT } from "@/lib/location/nominatim"

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

function placeFromAddress(address: NominatimAddress): ReverseGeocodeResult | null {
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.suburb ??
    address.hamlet ??
    address.locality ??
    ""
  const region =
    address.state ??
    address.region ??
    address.state_district ??
    address.county ??
    ""
  const country = address.country ?? ""

  if (!city && !region && !country) return null

  return { city, region, country }
}

function placeFromDisplayName(displayName: string): ReverseGeocodeResult | null {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 2) return null

  const country = parts[parts.length - 1] ?? ""
  const city = parts[0] ?? ""
  const region = parts.length > 2 ? (parts[parts.length - 2] ?? "") : ""

  if (!city && !country) return null

  return { city, region, country }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set("lat", String(latitude))
  url.searchParams.set("lon", String(longitude))
  url.searchParams.set("format", "json")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("accept-language", "en")
  url.searchParams.set("zoom", "14")

  let response: Response
  try {
    response = await fetch(url.toString(), {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
      cache: "no-store",
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  let data: NominatimResponse
  try {
    data = (await response.json()) as NominatimResponse
  } catch {
    return null
  }

  if (data.address) {
    const fromAddress = placeFromAddress(data.address)
    if (fromAddress) return fromAddress
  }

  if (data.display_name) {
    return placeFromDisplayName(data.display_name)
  }

  return null
}
