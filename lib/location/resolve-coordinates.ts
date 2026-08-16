import { geocodePlace } from "@/lib/location/forward-geocode"

export type ResolveCoordinatesInput = {
  city?: string | null
  region?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

export async function resolveCoordinates(
  input: ResolveCoordinatesInput,
): Promise<{ latitude: number; longitude: number } | null> {
  if (input.latitude != null && input.longitude != null) {
    return { latitude: input.latitude, longitude: input.longitude }
  }

  return geocodePlace({
    city: input.city,
    region: input.region,
    country: input.country,
  })
}
