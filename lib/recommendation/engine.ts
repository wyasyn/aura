import {
  backfillFromHeldBack,
  DEFAULT_MAX_RECOMMENDATIONS,
  MIN_CONFIDENT_RECOMMENDATIONS,
  rankCandidates,
} from "@/lib/recommendation/rank"
import { buildRoutine, type Routine } from "@/lib/recommendation/routine"
import { applySafetyFilters, requireConcernMatch } from "@/lib/recommendation/safety"
import { scoreCatalogue } from "@/lib/recommendation/scoring"
import type {
  CandidateProduct,
  ExcludedCandidate,
  RecommendationContext,
  ScoredCandidate,
} from "@/lib/recommendation/types"
import {
  DEFAULT_WEIGHTS,
  WEIGHTS_VERSION,
  type ScoringWeights,
} from "@/lib/recommendation/weights"

/**
 * Stages four through eight, in order, as one pure function.
 *
 * Context in, ranked routine out. No database, no network, no clock: the same
 * inputs must always produce the same advice, because a recommendation that
 * cannot be reproduced cannot be explained to the person who received it.
 *
 * The result carries everything needed to justify itself — the weights that
 * were applied, the version of the arithmetic, what each axis matched on, and
 * every product that was excluded and why. An empty shortlist is a reportable
 * outcome here, not a silent one.
 */

export type RunEngineOptions = {
  weights?: ScoringWeights
  max?: number
  /** Relax the one-per-category rule to fill the shortlist. Default true. */
  allowCategoryBackfill?: boolean
}

export type EngineResult = {
  selected: ScoredCandidate[]
  routine: Routine
  excluded: ExcludedCandidate[]
  /** Every scored candidate, ranked. Kept for analytics, not for display. */
  ranked: ScoredCandidate[]
  /** Slots the catalogue could not fill. Drives the gap-fill decision. */
  unfilled: number
  /**
   * Whether the engine reached the minimum it considers a confident answer.
   *
   * False is not a failure — it is the engine saying the catalogue does not
   * support more than this, which is exactly the signal the caller needs
   * before deciding whether to ask anything else to fill the gap.
   */
  confident: boolean
  weights: ScoringWeights
  weightsVersion: string
}

export function runRecommendationEngine(
  catalogue: CandidateProduct[],
  context: RecommendationContext,
  options: RunEngineOptions = {},
): EngineResult {
  const weights = options.weights ?? DEFAULT_WEIGHTS
  const max = options.max ?? DEFAULT_MAX_RECOMMENDATIONS

  // Stage 5, in two passes. Safety first and unconditionally; relevance
  // second, because it needs the concern view and is not a safety claim.
  const safety = applySafetyFilters(catalogue, context)
  const relevance = requireConcernMatch(safety.safe, context)
  const excluded = [...safety.excluded, ...relevance.excluded]

  // Stages 6 and 7.
  const scored = scoreCatalogue(relevance.safe, context, weights)
  const ranked = rankCandidates(scored, { max })
  const filled = options.allowCategoryBackfill === false
    ? ranked
    : backfillFromHeldBack(ranked)

  return {
    selected: filled.selected,
    // Stage 8.
    routine: buildRoutine(filled.selected),
    excluded,
    ranked: [...scored].sort((a, b) => b.score - a.score),
    unfilled: filled.unfilled,
    confident: filled.selected.length >= MIN_CONFIDENT_RECOMMENDATIONS,
    weights,
    weightsVersion: WEIGHTS_VERSION,
  }
}
