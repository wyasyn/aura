import type { GapFillReason } from "@/generated/prisma/client"
import { currentCatalogueScope } from "@/lib/products/catalogue-scope"
import { resolveStoreUrl } from "@/lib/products/store-url"
import { loadCandidates } from "@/lib/recommendation/candidates"
import { weightsForScope } from "@/lib/recommendation/clinic-weights"
import { buildRecommendationContext } from "@/lib/recommendation/context"
import { runRecommendationEngine, type EngineResult } from "@/lib/recommendation/engine"
import { applyModelReasons, deterministicReason } from "@/lib/recommendation/explain"
import { explainWithGemini } from "@/lib/recommendation/explain-gemini"
import { MIN_CONFIDENT_RECOMMENDATIONS } from "@/lib/recommendation/rank"
import type { UserScanContext } from "@/lib/ai/types"
import type { ProductRecommendation, SkinAssessment } from "@/lib/scan/types"

/**
 * The recommendation pipeline as one call: context, engine, explanation.
 *
 * Aurora decides which products and in what order. Gemini is asked only to
 * phrase the reasons for the products it is handed, and its output is applied
 * over sentences the engine already wrote — so a failed, slow or malformed
 * model call costs polish, never advice.
 */

export type RecommendInput = {
  assessment: Pick<SkinAssessment, "dimensions" | "summary"> | null
  profile: UserScanContext["profile"]
  location: UserScanContext["location"]
  /** Omit to skip the phrasing pass and ship the deterministic reasons. */
  modelId?: string | null
}

export type RecommendOutput = {
  recommendations: ProductRecommendation[]
  result: EngineResult
  candidateCount: number
  usedClinicWeights: boolean
  /**
   * Slots the engine could not fill, and why.
   *
   * Non-null is the signal that something else may fill the remainder. Recorded
   * on every scan so the bypass is measurable rather than silent: a fallback
   * nobody can count is a fallback nobody can fix.
   */
  gapFillReason: GapFillReason | null
  gapFillCount: number
}

function gapFillReasonFor(result: EngineResult, candidateCount: number): GapFillReason | null {
  if (result.selected.length >= MIN_CONFIDENT_RECOMMENDATIONS) return null
  if (candidateCount === 0) return "no_safe_candidates"
  // Every candidate excluded before scoring is a different failure from every
  // candidate scoring too low, and the two call for opposite fixes: one is a
  // safety or scoping problem, the other a data or weighting one.
  if (result.ranked.length === 0) return "no_safe_candidates"
  if (result.selected.length === 0) return "no_relevant_candidates"
  return "below_minimum"
}

export async function recommendForScan(
  input: RecommendInput,
): Promise<RecommendOutput> {
  const scope = await currentCatalogueScope()
  const [candidates, { weights, usedClinicWeights }] = await Promise.all([
    loadCandidates(scope),
    weightsForScope(scope),
  ])

  const context = buildRecommendationContext({
    assessment: input.assessment,
    profile: input.profile,
    location: input.location,
  })

  const result = runRecommendationEngine(candidates, context, { weights })

  // Deterministic reasons first, always. The model pass overlays them.
  let reasons = new Map(
    result.selected.map((candidate) => [
      candidate.product.slug,
      deterministicReason(candidate),
    ]),
  )

  if (input.modelId && result.selected.length > 0) {
    try {
      const explained = await explainWithGemini({
        candidates: result.selected,
        summary: input.assessment?.summary ?? null,
        modelId: input.modelId,
      })
      reasons = applyModelReasons(result.selected, explained.reasons)
    } catch (err) {
      // The advice is already correct and already explained. Losing the
      // phrasing is a degradation, not a failure, so it never takes the
      // recommendation down with it.
      console.error("[recommend] Explanation pass failed", err)
    }
  }

  const recommendations: ProductRecommendation[] = result.selected.map((candidate) => ({
    id: candidate.product.slug,
    name: candidate.product.name,
    reason: reasons.get(candidate.product.slug) ?? deterministicReason(candidate),
    imageUrl: candidate.product.imageUrl,
    storeUrl: resolveStoreUrl({
      storeUrl: candidate.product.storeUrl,
      slug: candidate.product.slug,
    }),
    source: candidate.product.source,
    classifications: [
      candidate.product.primaryClassification,
      ...candidate.product.secondaryClassifications,
    ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
  }))

  const gapFillReason = gapFillReasonFor(result, candidates.length)

  return {
    recommendations,
    result,
    candidateCount: candidates.length,
    usedClinicWeights,
    gapFillReason,
    gapFillCount: gapFillReason
      ? Math.max(0, MIN_CONFIDENT_RECOMMENDATIONS - result.selected.length)
      : 0,
  }
}
