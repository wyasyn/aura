import type { ClimateBand } from "@/generated/prisma/client"
import { mapUserClimateToTags } from "@/lib/climate/tag-match"
import type { UserScanContext } from "@/lib/ai/types"
import { concernStrengths, deriveConcerns } from "@/lib/recommendation/concerns"
import type { RecommendationContext } from "@/lib/recommendation/types"
import type { SkinAssessment } from "@/lib/scan/types"

/**
 * Assembles everything the engine reasons over, once.
 *
 * Built from the scan the model just produced and the profile the person
 * already gave. It carries no identifiers of any kind — the engine scores a
 * situation, not a user — so nothing here can reach a stored recommendation or
 * a prompt by accident.
 */

/**
 * Narrows a stored band string to the enum, or to null.
 *
 * `UserScanContext` types these loosely, and the engine compares them against
 * a product's `ClimateBand[]`. A cast would let an unrecognised value through
 * to be compared against bands it can never equal, which reads as "no climate
 * match" and is indistinguishable from a product that genuinely does not fit.
 * Null says the band is unknown, which is what an unrecognised value means.
 */
const CLIMATE_BANDS = new Set<ClimateBand>(["low", "moderate", "high", "extreme"])

function toClimateBand(value: string | null | undefined): ClimateBand | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase() as ClimateBand
  return CLIMATE_BANDS.has(normalized) ? normalized : null
}

export type BuildContextInput = {
  assessment: Pick<SkinAssessment, "dimensions"> | null
  profile: UserScanContext["profile"]
  location: UserScanContext["location"]
}

export function buildRecommendationContext(
  input: BuildContextInput,
): RecommendationContext {
  const concerns = deriveConcerns({
    dimensions: input.assessment?.dimensions?.map((dimension) => ({
      id: dimension.id,
      band: dimension.band,
    })),
    primaryConcerns: input.profile?.primaryConcerns ?? [],
    skinGoals: input.profile?.skinGoals ?? [],
  })

  return {
    concerns,
    concernStrengths: concernStrengths(concerns),
    skinType: input.profile?.skinType ?? null,
    dosha: input.profile?.skinDosha ?? null,
    goals: input.profile?.skinGoals ?? [],
    climateTags: mapUserClimateToTags(input.location),
    humidityBand: toClimateBand(input.location?.humidityBand),
    temperatureBand: toClimateBand(input.location?.temperatureBand),
    uvBand: toClimateBand(input.location?.uvIndexBand),
    allergies: input.profile?.allergies ?? null,
  }
}
