import type { SkinDimensionId } from "@/lib/scan/dimensions"
import type { UserScanContext } from "@/lib/ai/types"

type ConcernMapping = {
  dimensions: SkinDimensionId[]
  cosmeticTerms: string
}

/** Maps onboarding/profile concern ids to scan dimensions and allowed cosmetic language. */
export const PROFILE_CONCERN_GUIDANCE: Record<string, ConcernMapping> = {
  acne: {
    dimensions: ["texture_pores", "redness"],
    cosmeticTerms: "blemishes, breakout-prone areas, congestion",
  },
  oiliness: {
    dimensions: ["texture_pores", "hydration"],
    cosmeticTerms: "excess sebum, shine, oil balance",
  },
  dryness: {
    dimensions: ["hydration", "texture_pores"],
    cosmeticTerms: "dry patches, surface dehydration",
  },
  redness: {
    dimensions: ["redness"],
    cosmeticTerms: "visible redness, flushing",
  },
  hyperpigmentation: {
    dimensions: ["pigmentation", "aging_spots"],
    cosmeticTerms: "uneven tone, dark spots, post-blemish marks",
  },
  aging: {
    dimensions: ["wrinkles", "aging_spots"],
    cosmeticTerms: "fine lines, elasticity, visible aging patterns",
  },
  sensitivity: {
    dimensions: ["redness"],
    cosmeticTerms: "reactive appearance, irritation-prone areas",
  },
  texture: {
    dimensions: ["texture_pores"],
    cosmeticTerms: "uneven texture, enlarged pores, roughness",
  },
}

const SKIN_GOAL_GUIDANCE: Record<string, string> = {
  hydration: "surface hydration and moisture balance",
  even_tone: "tone evenness and pigmentation",
  clear_skin: "blemish and congestion patterns",
  barrier_support: "barrier comfort and sensitivity",
  sun_protection: "UV exposure and pigmentation protection",
  gentle_routine: "gentle, low-irritation care",
}

function formatConcernLine(concern: string): string | null {
  const mapping = PROFILE_CONCERN_GUIDANCE[concern]
  if (!mapping) return null
  return `- ${concern}: reflect in ${mapping.dimensions.join(", ")} using cosmetic terms such as ${mapping.cosmeticTerms}`
}

function formatGoalLine(goal: string): string | null {
  const guidance = SKIN_GOAL_GUIDANCE[goal]
  if (!guidance) return null
  return `- ${goal}: tie recommendations to ${guidance}`
}

export function collectProfileWellnessPriorities(
  profile: UserScanContext["profile"],
): string[] {
  if (!profile) return []
  const priorities = new Set<string>()
  for (const concern of profile.primaryConcerns) {
    priorities.add(concern)
  }
  for (const goal of profile.skinGoals) {
    priorities.add(goal)
  }
  return [...priorities]
}

/**
 * The per-user layer of the scan prompt: which dimensions each stated concern
 * maps onto, and the cosmetic vocabulary allowed for it.
 *
 * This block used to open with a restatement of the system prompt's grounding
 * and recommendation rules. Those live in the system prompt now and are stated
 * once; repeating them here only diluted both copies.
 */
export function buildProfileConcernPromptBlock(
  profile: UserScanContext["profile"],
): string {
  if (!profile) {
    return "No stated concerns or goals on file. Assess the photo on its own terms."
  }

  const concernLines = profile.primaryConcerns
    .map(formatConcernLine)
    .filter((line): line is string => line != null)
  const goalLines = profile.skinGoals
    .map(formatGoalLine)
    .filter((line): line is string => line != null)

  if (concernLines.length === 0 && goalLines.length === 0) {
    return "No stated concerns or goals on file. Assess the photo on its own terms."
  }

  const sections: string[] = [
    "Stated wellness priorities. Map each onto the dimensions listed and use only the cosmetic vocabulary shown:",
  ]

  if (concernLines.length > 0) {
    sections.push("Primary concerns:", ...concernLines)
  }

  if (goalLines.length > 0) {
    sections.push("Skin goals:", ...goalLines)
  }

  if (profile.primaryConcerns.length > 0) {
    sections.push(
      `Account for every one of these exactly once: ${profile.primaryConcerns.join(", ")}. Visible ones are covered by the finding that shows them; the rest go in concernsNotVisible. Do not name a concern in the summary as a concern.`,
    )
  }

  return sections.join("\n")
}
