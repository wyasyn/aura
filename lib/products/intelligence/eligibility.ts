import type { ProductIntelligenceStatus } from "@/generated/prisma/client"

import { CONFIDENT_RECOMMENDATION_THRESHOLD } from "@/lib/products/completeness"

/**
 * What an extraction produced, and whether the engine can act on it.
 *
 * Pure and separate from the extraction itself, because these are policy
 * decisions rather than mechanics: how complete is complete enough, and what
 * disqualifies a product from being recommended. Both need to be readable and
 * testable without a model call or a database.
 */

/** What the extraction established about one product. */
export type ExtractionOutcome = {
  /** Whether a classification was reached at all. */
  classified: boolean
  completenessScore: number
  /** Field labels the completeness assessment found empty. */
  missing: string[]
}

/**
 * The status a completed extraction leaves behind.
 *
 * `needs_review` is not a failure. It says the extraction ran and honestly
 * found too little for the engine to rely on — usually because the product's
 * own description does not say what skin it suits or what it contains. The
 * remedy is better source data or an administrator filling the gaps, not a
 * re-run of the same pass over the same text.
 */
export function statusForOutcome(
  outcome: ExtractionOutcome,
): Extract<ProductIntelligenceStatus, "extracted" | "needs_review"> {
  if (!outcome.classified) return "needs_review"
  return outcome.completenessScore >= CONFIDENT_RECOMMENDATION_THRESHOLD
    ? "extracted"
    : "needs_review"
}

/** Everything eligibility depends on. */
export type EligibilityInput = {
  isActive: boolean
  intelligenceStatus: ProductIntelligenceStatus
  intelligenceStale: boolean
  completenessScore: number
  primaryClassification: string | null
  targetConcerns: string[]
}

export type Eligibility = {
  eligible: boolean
  /** Why not, in the order they would be fixed. Empty when eligible. */
  reasons: string[]
}

/**
 * Whether the engine should be allowed to select this product.
 *
 * Distinct from `isRecommendable`, which is an administrator's decision to
 * withdraw a product from advice. This is a statement about the data: a product
 * the engine cannot reason about is not one an administrator has withheld, and
 * reporting the two as the same thing would leave somebody hunting for a switch
 * nobody flipped.
 *
 * The concern check is the one that actually matters at runtime. The engine
 * already drops products matching nothing the person asserts, so a product with
 * no concerns at all can never be selected however complete it looks — saying
 * so here turns a silent never-recommended into a visible reason.
 */
export function evaluateEligibility(input: EligibilityInput): Eligibility {
  const reasons: string[] = []

  if (!input.isActive) {
    reasons.push("Archived")
  }

  if (input.intelligenceStatus === "failed") {
    reasons.push("Intelligence extraction failed")
  }

  if (input.intelligenceStatus === "pending" || input.intelligenceStatus === "extracting") {
    reasons.push("Awaiting intelligence extraction")
  }

  if (input.intelligenceStale) {
    reasons.push("Source changed since intelligence was extracted")
  }

  if (!input.primaryClassification) {
    reasons.push("No product classification")
  }

  if (input.targetConcerns.length === 0) {
    reasons.push("No target concerns — the engine could never match it")
  }

  if (input.completenessScore < CONFIDENT_RECOMMENDATION_THRESHOLD) {
    reasons.push(
      `Intelligence ${input.completenessScore}% complete, below the ${CONFIDENT_RECOMMENDATION_THRESHOLD}% the engine relies on`,
    )
  }

  return { eligible: reasons.length === 0, reasons }
}
