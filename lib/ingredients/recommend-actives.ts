import { prisma } from "@/lib/db/client"
import { mapUserClimateToTags } from "@/lib/climate/tag-match"
import type { UserScanContext } from "@/lib/ai/types"
import type { RecommendedActive } from "@/lib/ingredients/types"

export type { RecommendedActive } from "@/lib/ingredients/types"

type RecommendActivesInput = {
  profile: UserScanContext["profile"]
  location: UserScanContext["location"]
  limit?: number
}

export async function recommendActivesForUser(
  input: RecommendActivesInput,
): Promise<RecommendedActive[]> {
  const limit = input.limit ?? 8
  const concerns = new Set(input.profile?.primaryConcerns ?? [])
  const skinGoals = input.profile?.skinGoals ?? []
  for (const goal of skinGoals) {
    concerns.add(goal)
  }

  const skinType = input.profile?.skinType ?? null
  const dosha = input.profile?.skinDosha ?? null
  const climateTags = mapUserClimateToTags(input.location)

  const whereClauses: Array<Record<string, unknown>> = []

  if (concerns.size > 0) {
    whereClauses.push({ targetConcerns: { hasSome: [...concerns] } })
  }
  if (skinType) {
    whereClauses.push({ suitableSkinTypes: { has: skinType } })
  }
  if (climateTags.length > 0) {
    whereClauses.push({ climateTags: { hasSome: climateTags } })
  }
  if (dosha) {
    whereClauses.push({ doshaAffinities: { has: dosha } })
  }

  if (whereClauses.length === 0) {
    return []
  }

  const ingredients = await prisma.ingredient.findMany({
    where: { OR: whereClauses },
    take: 40,
  })

  const scored = ingredients.map((ingredient) => {
    const reasons: string[] = []
    let score = 0

    const concernMatches = ingredient.targetConcerns.filter((concern) =>
      concerns.has(concern),
    )
    if (concernMatches.length > 0) {
      score += concernMatches.length * 3
      reasons.push(`Matches concerns: ${concernMatches.join(", ")}`)
    }

    if (skinType && ingredient.suitableSkinTypes.includes(skinType)) {
      score += 2
      reasons.push(`Suitable for ${skinType} skin`)
    }

    const climateMatches = ingredient.climateTags.filter((tag) =>
      (climateTags as string[]).includes(tag),
    )
    if (climateMatches.length > 0) {
      score += climateMatches.length * 2
      reasons.push(`Climate fit: ${climateMatches.join(", ")}`)
    }

    if (dosha && ingredient.doshaAffinities.includes(dosha)) {
      score += 2
      reasons.push(`Dosha lean: ${dosha}`)
    }

    return {
      inciName: ingredient.inciName,
      displayName: ingredient.displayName ?? ingredient.inciName,
      reasons,
      score,
    }
  })

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
