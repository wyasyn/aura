import type { UserLocation } from "@/generated/prisma/client"

import { revalidateUserScanContext } from "@/lib/ai/context/cache-tags"
import {
  fetchClimateSnapshot,
  type ClimateSnapshot,
} from "@/lib/climate/sync"
import { prisma } from "@/lib/db/client"
import {
  resolveCoordinates,
  type ResolveCoordinatesInput,
} from "@/lib/location/resolve-coordinates"

export {
  parseLocationSnapshot,
  toLocationSnapshot,
  toScanClimateContext,
  type LocationClimateFields,
} from "@/lib/climate/snapshot"

export async function refreshClimateForPlace(
  input: ResolveCoordinatesInput,
): Promise<{
  climate: ClimateSnapshot
  latitude: number
  longitude: number
} | null> {
  const coords = await resolveCoordinates(input)
  if (!coords) return null

  const climate = await fetchClimateSnapshot(coords.latitude, coords.longitude)
  return { climate, ...coords }
}

function hasResolvablePlace(input: ResolveCoordinatesInput): boolean {
  return (
    Boolean(input.city?.trim()) ||
    Boolean(input.region?.trim()) ||
    Boolean(input.country?.trim()) ||
    (input.latitude != null && input.longitude != null)
  )
}

export async function ensureClimateForScan(
  userId: string,
): Promise<UserLocation | null> {
  let location: UserLocation | null = null

  try {
    location = await prisma.userLocation.findUnique({ where: { userId } })
  } catch (err) {
    console.error("[climate] Failed to load user location:", err)
    return null
  }

  if (!location || !hasResolvablePlace(location)) return location

  try {
    const refreshed = await refreshClimateForPlace(location)
    if (!refreshed) return location

    return prisma.userLocation.update({
      where: { userId },
      data: {
        ...refreshed.climate,
        latitude: refreshed.latitude,
        longitude: refreshed.longitude,
        lastSyncedAt: new Date(),
      },
    }).then((updated) => {
      revalidateUserScanContext(userId)
      return updated
    })
  } catch {
    return location
  }
}
