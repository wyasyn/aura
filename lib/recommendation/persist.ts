import type { GapFillReason, PrismaClient } from "@/generated/prisma/client"
import type { EngineResult } from "@/lib/recommendation/engine"
import type { ScoredCandidate } from "@/lib/recommendation/types"

/**
 * Records what the engine decided, and what it could not.
 *
 * Written per product rather than as a blob on ScanResult, because this is what
 * feedback attaches to and what analytics aggregates. A blob can be displayed;
 * it cannot be joined, counted, or asked which axis carried a recommendation
 * nobody found useful.
 *
 * The run row is written even when nothing was selected. An empty result is the
 * outcome most worth knowing about, and a table that only records successes
 * cannot report how often the deterministic path was bypassed.
 */

type Writer = Pick<PrismaClient, "scanRecommendation" | "scanRecommendationRun">

/** A slot the engine did not fill, as handed to the model. */
export type GapFilled = {
  productSlug: string
  productName: string
  source: "aurora" | "clinic"
}

export type PersistInput = {
  scanId: string
  result: EngineResult
  candidateCount: number
  usedClinicWeights: boolean
  /** Products the model supplied for slots the engine left open. */
  gapFilled?: GapFilled[]
  gapFillReason?: GapFillReason | null
}

function exclusionCounts(result: EngineResult): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const excluded of result.excluded) {
    counts[excluded.reason] = (counts[excluded.reason] ?? 0) + 1
  }
  return counts
}

function toRow(
  scanId: string,
  candidate: ScoredCandidate,
  rank: number,
  result: EngineResult,
) {
  return {
    scanId,
    productSlug: candidate.product.slug,
    productName: candidate.product.name,
    rank,
    origin: "engine" as const,
    score: candidate.score,
    rawScore: candidate.rawScore,
    components: candidate.components,
    addresses: candidate.citableConcerns,
    citedActives: candidate.citableIngredients,
    // Snapshotted, not referenced. Weights are tenant-editable, so a reference
    // would let a clinic retune and silently rewrite the explanation of every
    // recommendation it had already given.
    weights: result.weights,
    weightsVersion: result.weightsVersion,
    source: candidate.product.source,
  }
}

/**
 * Writes the run and its recommendations in one transaction.
 *
 * Joined so a scan can never end up with recommendations and no run to explain
 * them, or a run claiming products that were not recorded. Both halves are the
 * same fact stated at two grains.
 */
export async function persistRecommendations(
  tx: Writer,
  input: PersistInput,
): Promise<void> {
  const { scanId, result } = input
  const gapFilled = input.gapFilled ?? []

  await tx.scanRecommendationRun.create({
    data: {
      scanId,
      candidateCount: input.candidateCount,
      exclusions: exclusionCounts(result),
      engineCount: result.selected.length,
      gapFillCount: gapFilled.length,
      gapFillReason: input.gapFillReason ?? null,
      confident: result.confident,
      weightsVersion: result.weightsVersion,
      usedClinicWeights: input.usedClinicWeights,
    },
  })

  const engineRows = result.selected.map((candidate, index) =>
    toRow(scanId, candidate, index + 1, result),
  )

  // Gap fills continue the same rank sequence, so rank still means position as
  // shown. Score stays null rather than zero: zero would claim the engine
  // assessed the product and found nothing, when in fact it never saw it.
  const gapRows = gapFilled.map((filled, index) => ({
    scanId,
    productSlug: filled.productSlug,
    productName: filled.productName,
    rank: engineRows.length + index + 1,
    origin: "model_gap_fill" as const,
    gapFillReason: input.gapFillReason ?? null,
    score: null,
    rawScore: null,
    components: undefined,
    addresses: [],
    citedActives: [],
    weights: undefined,
    weightsVersion: result.weightsVersion,
    source: filled.source,
  }))

  const rows = [...engineRows, ...gapRows]
  if (rows.length === 0) return

  await tx.scanRecommendation.createMany({ data: rows })
}
