import { unstable_cache } from "next/cache"
import { cache } from "react"

import {
  USER_SCAN_CONTEXT_REVALIDATE_SECONDS,
  userScanContextTag,
} from "@/lib/ai/context/cache-tags"
import {
  recallUserScanContext,
  rememberUserScanContext,
} from "@/lib/ai/context/memory-snapshot"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import type { UserScanContext } from "@/lib/ai/types"

async function fetchUserScanContext(userId: string): Promise<UserScanContext> {
  const [profile, location] = await withDbRetry(() =>
    Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.userLocation.findUnique({ where: { userId } }),
    ]),
  )

  const context: UserScanContext = {
    profile: profile
      ? {
          ageBand: profile.ageBand,
          skinType: profile.skinType,
          fitzpatrickBand: profile.fitzpatrickBand,
          skinDosha: profile.skinDosha,
          primaryConcerns: profile.primaryConcerns,
          skinGoals: profile.skinGoals,
          allergies: profile.allergies,
          currentRoutine: profile.currentRoutine,
          lifestyleFactors: profile.lifestyleFactors,
        }
      : null,
    location: location
      ? {
          city: location.city,
          region: location.region,
          country: location.country,
          uvIndexBand: location.uvIndexBand,
          humidityBand: location.humidityBand,
          temperatureBand: location.temperatureBand,
          climateZone: location.climateZone,
          seasonBand: location.seasonBand,
        }
      : null,
  }

  rememberUserScanContext(userId, context)
  return context
}

export const getUserScanContext = cache(
  async (userId: string): Promise<UserScanContext> => {
    try {
      return await unstable_cache(
        () => fetchUserScanContext(userId),
        ["user-scan-context", userId],
        {
          tags: [userScanContextTag(userId)],
          revalidate: USER_SCAN_CONTEXT_REVALIDATE_SECONDS,
        },
      )()
    } catch (error) {
      const snapshot = recallUserScanContext(userId)
      if (snapshot) {
        console.warn(
          "[ai-context] using in-memory user scan context snapshot after DB failure",
        )
        return snapshot
      }
      throw error
    }
  },
)
