import { z } from "zod"

/**
 * How much each axis contributes to a product's score.
 *
 * Weights are data, not code, because clinics tune their own. But the shape and
 * the defaults live here and are versioned, so a stored recommendation can
 * always be explained: the version says which arithmetic produced it, and the
 * snapshot stored alongside says which numbers went in.
 */

export type ScoringWeights = {
  /** Product concerns matching what the scan and profile assert. */
  concernMatch: number
  /** Product declares the user's skin type as suitable. */
  skinTypeFit: number
  /** Product's coarse climate tags match the user's live climate. */
  climateFit: number
  /** Product's climate bands match the user's measured bands. */
  climateBandFit: number
  /** A citable active whose own concerns match the user's. */
  ingredientEvidence: number
  /** Product's claimed benefits match the user's stated goals. */
  benefitAlignment: number
  /** Ingredient dosha affinities match the user's cosmetic lean. */
  doshaAffinity: number
  /**
   * What a product with zero completeness keeps, as a fraction.
   *
   * A multiplier rather than an axis. Data quality is not a reason to
   * recommend something — a thoroughly documented moisturiser is not a better
   * answer to acne than a sparsely documented cleanser. It is a reason to
   * trust a match, so it scales the score the match earned rather than adding
   * to it. At 1 the engine ignores completeness entirely.
   */
  completenessFloor: number
  /**
   * What an unconfirmed classification keeps, as a fraction.
   *
   * Every enriched product currently sits at `imported`, so at 1.0 this is
   * inert. It exists so that confirming a product's data can be made to matter
   * without a code change, which is the point of a review step.
   */
  unconfirmedFactor: number
}

/**
 * Bumped whenever the arithmetic changes, not when a clinic retunes a number.
 *
 * Stored on every persisted recommendation. Without it, a ranking from last
 * month cannot be reproduced or defended, because there is no way to know
 * which formula produced it.
 */
export const WEIGHTS_VERSION = "1.0.0"

/**
 * Aurora's defaults, and the fallback for any clinic that has not tuned.
 *
 * Concern match dominates deliberately. Everything else refines a product that
 * already addresses something the person actually has; none of it should be
 * able to promote a product that addresses nothing.
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  concernMatch: 10,
  skinTypeFit: 4,
  climateFit: 2,
  climateBandFit: 2,
  ingredientEvidence: 5,
  benefitAlignment: 3,
  doshaAffinity: 1,
  completenessFloor: 0.5,
  unconfirmedFactor: 1,
}

/**
 * What a clinic may store.
 *
 * Bounded on every field. Weights arrive from a tenant-editable table, and an
 * unbounded or negative weight would let one clinic invert the engine — a
 * negative concernMatch ranks the least relevant product first. The floors and
 * factors are fractions and are clamped to [0, 1] for the same reason.
 */
export const scoringWeightsSchema = z.object({
  concernMatch: z.number().min(0).max(100),
  skinTypeFit: z.number().min(0).max(100),
  climateFit: z.number().min(0).max(100),
  climateBandFit: z.number().min(0).max(100),
  ingredientEvidence: z.number().min(0).max(100),
  benefitAlignment: z.number().min(0).max(100),
  doshaAffinity: z.number().min(0).max(100),
  completenessFloor: z.number().min(0).max(1),
  unconfirmedFactor: z.number().min(0).max(1),
})

/**
 * Reads stored weights, falling back to the defaults field by field.
 *
 * Field by field rather than all-or-nothing: a clinic that tuned one number
 * and a later release that adds an eighth axis must not silently reset the
 * seven they already set, nor leave the new axis undefined.
 */
export function resolveWeights(stored: unknown): ScoringWeights {
  if (!stored || typeof stored !== "object") return DEFAULT_WEIGHTS

  const merged = { ...DEFAULT_WEIGHTS, ...(stored as Partial<ScoringWeights>) }
  const parsed = scoringWeightsSchema.safeParse(merged)

  // An unparseable stored value falls back to the defaults rather than
  // throwing. A clinic with a corrupt weights row should get Aurora's
  // recommendations, not an error page where its recommendations used to be.
  return parsed.success ? parsed.data : DEFAULT_WEIGHTS
}
