import type { AssessmentBand } from "@/lib/scan/types"
import type { SkinDimensionId } from "@/lib/scan/dimensions"

/**
 * Bridges the two concern vocabularies Aurora already speaks.
 *
 * A scan reports six fixed cosmetic dimensions; a product declares concerns
 * from a twelve-term list. Nothing previously connected them — the model held
 * the mapping in its head, differently on every run. Writing it down is what
 * makes a product's fit to a scan computable at all, and it is the reason a
 * recommendation can now say which finding it answers.
 */

/**
 * What a raised dimension means in product-concern terms.
 *
 * One dimension can imply several concerns: visible congestion is both a
 * texture problem and an oiliness problem, and a product addressing either is
 * relevant. Deliberately does not map to `sensitivity` from redness alone —
 * visible redness is not the same claim as reactive skin, and conflating them
 * would recommend products for a condition nobody observed.
 */
export const CONCERNS_BY_DIMENSION: Record<SkinDimensionId, readonly string[]> = {
  texture_pores: ["texture", "acne", "oiliness"],
  pigmentation: ["hyperpigmentation"],
  redness: ["redness"],
  wrinkles: ["aging"],
  // The hydration dimension is scored like the others — higher band means more
  // concern — so an elevated reading is dryness, not hydration achieved.
  hydration: ["dryness", "hydration", "barrier_support"],
  aging_spots: ["aging", "hyperpigmentation"],
}

/** Where a concern came from. Evidence and self-report are not the same claim. */
export type ConcernSource = "scan" | "profile" | "goal"

export type WeightedConcern = {
  concern: string
  source: ConcernSource
  /** 0–1. How strongly this concern is being asserted. */
  strength: number
}

/**
 * How much a band contributes.
 *
 * `minimal` and `mild` contribute nothing. A recommendation aimed at a
 * dimension that reads mild is answering a finding nobody would act on, and
 * the existing prompt already refuses to make one — the engine holds the same
 * line rather than quietly scoring it.
 */
const STRENGTH_BY_BAND: Record<AssessmentBand, number> = {
  not_assessed: 0,
  minimal: 0,
  mild: 0,
  moderate: 0.7,
  elevated: 1,
}

/**
 * Weight of a self-reported concern relative to a photographed one.
 *
 * Below `moderate`'s 0.7 on purpose. What the scan can see is evidence; what
 * someone typed during onboarding is context. Both matter, and when they agree
 * the concern accumulates — which is the correct outcome, because a stated
 * concern the photo confirms is the strongest signal available.
 */
export const PROFILE_CONCERN_STRENGTH = 0.5
/** A goal is an aspiration, not a finding. Lower still. */
export const GOAL_CONCERN_STRENGTH = 0.3

export type ScanDimensionReading = {
  id: string
  band: AssessmentBand
}

export type DeriveConcernsInput = {
  dimensions?: ScanDimensionReading[]
  primaryConcerns?: string[]
  skinGoals?: string[]
}

function isDimensionId(id: string): id is SkinDimensionId {
  return id in CONCERNS_BY_DIMENSION
}

/**
 * Everything this person is being recommended for, with provenance.
 *
 * Returned as a list rather than a set because the same concern arriving from
 * two directions is more evidence, not a duplicate to discard. Scoring sums
 * them, so a stated dryness the photo also shows outranks either alone.
 */
export function deriveConcerns(input: DeriveConcernsInput): WeightedConcern[] {
  const concerns: WeightedConcern[] = []

  for (const dimension of input.dimensions ?? []) {
    if (!isDimensionId(dimension.id)) continue
    const strength = STRENGTH_BY_BAND[dimension.band] ?? 0
    if (strength === 0) continue

    for (const concern of CONCERNS_BY_DIMENSION[dimension.id]) {
      concerns.push({ concern, source: "scan", strength })
    }
  }

  for (const concern of input.primaryConcerns ?? []) {
    concerns.push({
      concern,
      source: "profile",
      strength: PROFILE_CONCERN_STRENGTH,
    })
  }

  for (const concern of input.skinGoals ?? []) {
    concerns.push({ concern, source: "goal", strength: GOAL_CONCERN_STRENGTH })
  }

  return concerns
}

/** Total asserted strength per concern, capped so no concern can dominate. */
export const MAX_CONCERN_STRENGTH = 1.5

export function concernStrengths(
  concerns: WeightedConcern[],
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const { concern, strength } of concerns) {
    const key = concern.trim().toLowerCase()
    if (!key) continue
    totals.set(key, Math.min(MAX_CONCERN_STRENGTH, (totals.get(key) ?? 0) + strength))
  }

  return totals
}

/**
 * The concerns a recommendation is allowed to cite, strongest first.
 *
 * Used for the "which finding does this answer" sentence, so it is ordered by
 * how strongly the concern is asserted rather than by how the product happens
 * to list them.
 */
export function citableConcerns(
  productConcerns: string[],
  strengths: Map<string, number>,
): string[] {
  return productConcerns
    .map((concern) => concern.trim().toLowerCase())
    .filter((concern) => strengths.has(concern))
    .sort((a, b) => (strengths.get(b) ?? 0) - (strengths.get(a) ?? 0))
}
