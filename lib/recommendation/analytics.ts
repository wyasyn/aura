import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import type { CatalogueScope } from "@/lib/products/catalogue-scope"

/**
 * What the engine is actually doing, in aggregate.
 *
 * The reason stages nine and eleven store rows rather than blobs. These are the
 * questions that decide whether the engine is working: how often it answers on
 * its own, which axis carries the recommendations people find useful, and which
 * products it keeps proposing that nobody wants.
 *
 * Every query is tenant-scoped. An unscoped aggregate would let one clinic read
 * how another's catalogue performs, which is commercially sensitive in a way a
 * count does not look like until you notice it names products.
 */

function scopeFilter(scope: CatalogueScope) {
  // Aurora's own view is the platform's scans, not everyone's. A null scope
  // meaning "all tenants" would make the platform dashboard a cross-tenant
  // read by default, which is the wrong direction for a mistake to fail in.
  return { scan: { organizationId: scope } }
}

export type EngineHealth = {
  runs: number
  /** Runs where the engine reached its own minimum unaided. */
  confidentRuns: number
  /** Share of runs the engine answered alone, 0–1. */
  confidenceRate: number
  /** Runs where a model filled at least one slot. */
  runsWithGapFill: number
  gapFillsByReason: Record<string, number>
  /** Products recommended, split by who chose them. */
  engineRecommendations: number
  gapFillRecommendations: number
  averageCandidates: number
  runsUsingClinicWeights: number
}

/**
 * How often the deterministic path actually decided.
 *
 * The headline number for the architecture: if the confidence rate is low, the
 * engine is not the source of truth in practice however it is designed, and the
 * catalogue is the thing to fix.
 */
export async function engineHealth(
  scope: CatalogueScope,
  since?: Date,
): Promise<EngineHealth> {
  const where = {
    ...scopeFilter(scope),
    ...(since ? { createdAt: { gte: since } } : {}),
  }

  const runs = await withDbRetry(() =>
    prisma.scanRecommendationRun.findMany({
      where,
      select: {
        confident: true,
        gapFillCount: true,
        gapFillReason: true,
        engineCount: true,
        candidateCount: true,
        usedClinicWeights: true,
      },
    }),
  )

  const gapFillsByReason: Record<string, number> = {}
  let confidentRuns = 0
  let runsWithGapFill = 0
  let engineRecommendations = 0
  let gapFillRecommendations = 0
  let candidateTotal = 0
  let runsUsingClinicWeights = 0

  for (const run of runs) {
    if (run.confident) confidentRuns += 1
    if (run.gapFillCount > 0) {
      runsWithGapFill += 1
      const reason = run.gapFillReason ?? "unspecified"
      gapFillsByReason[reason] = (gapFillsByReason[reason] ?? 0) + run.gapFillCount
    }
    engineRecommendations += run.engineCount
    gapFillRecommendations += run.gapFillCount
    candidateTotal += run.candidateCount
    if (run.usedClinicWeights) runsUsingClinicWeights += 1
  }

  return {
    runs: runs.length,
    confidentRuns,
    confidenceRate: runs.length === 0 ? 0 : confidentRuns / runs.length,
    runsWithGapFill,
    gapFillsByReason,
    engineRecommendations,
    gapFillRecommendations,
    averageCandidates: runs.length === 0 ? 0 : Math.round(candidateTotal / runs.length),
    runsUsingClinicWeights,
  }
}

export type ProductPerformance = {
  productSlug: string
  productName: string
  timesRecommended: number
  averageRank: number
  helpful: number
  notRelevant: number
  alreadyUse: number
  didNotSuit: number
  /**
   * Verdicts received, as a share of times recommended.
   *
   * Reported alongside the counts because a product with one helpful vote out
   * of one recommendation is not outperforming one with forty out of a hundred,
   * and a ratio alone would say it was.
   */
  responseRate: number
}

/**
 * Which products the engine keeps proposing, and what people made of them.
 *
 * `already_use` is counted separately from `helpful` throughout: it says the
 * engine agreed with a choice the person had already made, which is
 * corroboration rather than a suggestion they acted on. Summing them would
 * overstate how often the engine told anybody something new.
 */
export async function productPerformance(
  scope: CatalogueScope,
  limit = 20,
): Promise<ProductPerformance[]> {
  const rows = await withDbRetry(() =>
    prisma.scanRecommendation.findMany({
      where: scopeFilter(scope),
      select: {
        productSlug: true,
        productName: true,
        rank: true,
        feedback: { select: { verdict: true } },
      },
    }),
  )

  const byProduct = new Map<string, ProductPerformance & { rankTotal: number }>()

  for (const row of rows) {
    const existing = byProduct.get(row.productSlug) ?? {
      productSlug: row.productSlug,
      productName: row.productName,
      timesRecommended: 0,
      averageRank: 0,
      rankTotal: 0,
      helpful: 0,
      notRelevant: 0,
      alreadyUse: 0,
      didNotSuit: 0,
      responseRate: 0,
    }

    existing.timesRecommended += 1
    existing.rankTotal += row.rank

    switch (row.feedback?.verdict) {
      case "helpful":
        existing.helpful += 1
        break
      case "not_relevant":
        existing.notRelevant += 1
        break
      case "already_use":
        existing.alreadyUse += 1
        break
      case "did_not_suit":
        existing.didNotSuit += 1
        break
      default:
        break
    }

    byProduct.set(row.productSlug, existing)
  }

  return [...byProduct.values()]
    .map(({ rankTotal, ...product }) => {
      const responses =
        product.helpful + product.notRelevant + product.alreadyUse + product.didNotSuit
      return {
        ...product,
        averageRank: Math.round((rankTotal / product.timesRecommended) * 10) / 10,
        responseRate:
          product.timesRecommended === 0 ? 0 : responses / product.timesRecommended,
      }
    })
    .sort((a, b) => b.timesRecommended - a.timesRecommended)
    .slice(0, limit)
}

export type ExclusionSummary = Record<string, number>

/**
 * Why candidates are being dropped, across runs.
 *
 * The counterpart to the confidence rate: when the engine is answering rarely,
 * this says whether the catalogue is being excluded on safety, on relevance, or
 * on availability — three problems with three different fixes.
 */
export async function exclusionSummary(
  scope: CatalogueScope,
  since?: Date,
): Promise<ExclusionSummary> {
  const runs = await withDbRetry(() =>
    prisma.scanRecommendationRun.findMany({
      where: {
        ...scopeFilter(scope),
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { exclusions: true },
    }),
  )

  const totals: ExclusionSummary = {}

  for (const run of runs) {
    if (!run.exclusions || typeof run.exclusions !== "object") continue
    for (const [reason, count] of Object.entries(run.exclusions)) {
      if (typeof count !== "number") continue
      totals[reason] = (totals[reason] ?? 0) + count
    }
  }

  return totals
}

export type AxisContribution = {
  axis: string
  /** Times this axis contributed anything to a recommendation people rated. */
  appearances: number
  /** Points contributed across recommendations rated helpful. */
  helpfulPoints: number
  /** Points contributed across recommendations rated not relevant. */
  notRelevantPoints: number
}

/**
 * Which axis is carrying recommendations people actually valued.
 *
 * This is what makes the weights tunable on evidence rather than instinct. An
 * axis contributing heavily to recommendations consistently marked not relevant
 * is weighted too high; one contributing to helpful recommendations and little
 * else is weighted too low.
 *
 * Reads the stored component breakdown, which is why it is stored per
 * recommendation rather than recomputed: the weights may have changed since,
 * and recomputing would answer a question about today's weights using
 * yesterday's feedback.
 */
export async function axisContribution(
  scope: CatalogueScope,
): Promise<AxisContribution[]> {
  const rows = await withDbRetry(() =>
    prisma.scanRecommendation.findMany({
      where: {
        ...scopeFilter(scope),
        origin: "engine",
        feedback: { isNot: null },
      },
      select: { components: true, feedback: { select: { verdict: true } } },
    }),
  )

  const byAxis = new Map<string, AxisContribution>()

  for (const row of rows) {
    if (!Array.isArray(row.components)) continue

    for (const component of row.components) {
      if (!component || typeof component !== "object") continue
      const { axis, points } = component as { axis?: unknown; points?: unknown }
      if (typeof axis !== "string" || typeof points !== "number" || points <= 0) {
        continue
      }

      const entry = byAxis.get(axis) ?? {
        axis,
        appearances: 0,
        helpfulPoints: 0,
        notRelevantPoints: 0,
      }

      entry.appearances += 1
      if (row.feedback?.verdict === "helpful") entry.helpfulPoints += points
      if (row.feedback?.verdict === "not_relevant") entry.notRelevantPoints += points

      byAxis.set(axis, entry)
    }
  }

  return [...byAxis.values()].sort((a, b) => b.appearances - a.appearances)
}
