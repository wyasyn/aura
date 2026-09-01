import type {
  DataConfidence,
  ProductIntelligenceStatus,
  ProductAvailability,
  ProductSource,
  ProductSyncStatus,
  RoutineCategory,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import {
  assessCompleteness,
  CONFIDENT_RECOMMENDATION_THRESHOLD,
} from "@/lib/products/completeness"
import { evaluateEligibility } from "@/lib/products/intelligence/eligibility"
import {
  readProvenance,
  type IntelligenceProvenance,
} from "@/lib/products/intelligence/provenance"

/**
 * What the administrator needs to see about the catalogue, from real records.
 *
 * Three states are reported separately because they are routinely conflated and
 * mean different things:
 *
 *   ACTIVE        — listed, and may appear anywhere the catalogue is shown.
 *   RECOMMENDABLE — the engine is allowed to select it.
 *   DATA COMPLETE — every field the intelligence pipeline wants is populated.
 *
 * A product can be any combination. One that is active and recommendable but
 * incomplete is not an error; it is a product the engine can pick with less to
 * go on, and the honest thing is to show that rather than to quietly withhold
 * it or quietly claim it is finished.
 */

export type ProductQualityRow = {
  id: string
  slug: string
  name: string
  imageUrl: string | null
  source: ProductSource
  externalId: string | null
  category: string
  primaryClassification: string | null
  suitableSkinTypes: string[]
  targetConcerns: string[]
  cosmeticBenefits: string[]
  climateTags: string[]
  routineCategory: RoutineCategory | null
  ingredientLinkCount: number
  completenessScore: number
  /** Field labels the completeness assessment found empty. */
  missing: string[]
  verificationStatus: DataConfidence
  classificationConfidence: DataConfidence
  intelligenceStale: boolean
  intelligenceStatus: ProductIntelligenceStatus
  intelligenceError: string | null
  sku: string
  priceCents: number | null
  currency: string | null
  storeUrl: string | null
  /** Source description, shown apart from the derived intelligence. */
  description: string
  ingredients: string | null
  /** Recorded origin per intelligence field. Absent entries claim nothing. */
  provenance: IntelligenceProvenance
  /** Why the engine may not select this product. Empty when it may. */
  eligibilityReasons: string[]
  isActive: boolean
  isRecommendable: boolean
  availability: ProductAvailability
  lastSyncedAt: Date | null
  organizationId: string | null
}

export type SyncRunSummary = {
  id: string
  source: ProductSource
  status: ProductSyncStatus
  startedAt: Date
  finishedAt: Date | null
  discovered: number
  created: number
  updated: number
  unchanged: number
  archived: number
  markedStale: number
  failed: number
  error: string | null
}

export type CatalogueHealth = {
  total: number
  active: number
  recommendable: number
  dataComplete: number
  /** Above the threshold the engine already treats as confidently recommendable. */
  aboveConfidenceThreshold: number
  /** Awaiting extraction: never assessed, or assessed from text that has changed. */
  needingExtraction: number
  /** Extracted but not confirmed by a person. */
  awaitingVerification: number
  /** One count per extraction status, from the rows themselves. */
  byIntelligenceStatus: Record<string, number>
  verified: number
  unverified: number
  stale: number
  failed: number
  /** Products the engine is currently allowed to select. */
  eligible: number
  bySource: Record<string, number>
  averageCompleteness: number
  lastSync: SyncRunSummary | null
  /**
   * Whether store credentials are present.
   *
   * Not whether they work: this is read from configuration without calling the
   * store, so a sync can still fail on a rejected key. `npm run woo:check`
   * answers the live question.
   */
  wooCommerceConfigured: boolean
}

function toQualityRow(
  product: Awaited<ReturnType<typeof fetchProducts>>[number],
): ProductQualityRow {
  const { score, missing } = assessCompleteness({
    name: product.name,
    description: product.description,
    brand: product.brand,
    imageUrl: product.imageUrl,
    primaryClassification: product.primaryClassification,
    targetConcerns: product.targetConcerns,
    suitableSkinTypes: product.suitableSkinTypes,
    cosmeticBenefits: product.cosmeticBenefits,
    climateTags: product.climateTags,
    ingredients: product.ingredients,
    routineCategory: product.routineCategory,
    priceCents: product.priceCents,
  })

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: product.imageUrl,
    source: product.source,
    externalId: product.externalId,
    category: product.category,
    primaryClassification: product.primaryClassification,
    suitableSkinTypes: product.suitableSkinTypes,
    targetConcerns: product.targetConcerns,
    cosmeticBenefits: product.cosmeticBenefits,
    climateTags: product.climateTags,
    routineCategory: product.routineCategory,
    ingredientLinkCount: product._count.ingredientLinks,
    // Recomputed here rather than read from the stored column. The two agree
    // after any write that goes through the pipeline, and where they disagree
    // it is the stored value that is stale — showing an administrator a number
    // that no longer matches the row would hide exactly the drift this view
    // exists to surface.
    completenessScore: score,
    missing,
    verificationStatus: product.verificationStatus,
    classificationConfidence: product.classificationConfidence,
    intelligenceStale: product.intelligenceStale,
    intelligenceStatus: product.intelligenceStatus,
    intelligenceError: product.intelligenceError,
    sku: product.sku,
    priceCents: product.priceCents,
    currency: product.currency,
    storeUrl: product.storeUrl,
    description: product.description,
    ingredients: product.ingredients,
    provenance: readProvenance(product.intelligenceProvenance),
    eligibilityReasons: evaluateEligibility({
      isActive: product.isActive,
      intelligenceStatus: product.intelligenceStatus,
      intelligenceStale: product.intelligenceStale,
      completenessScore: score,
      primaryClassification: product.primaryClassification,
      targetConcerns: product.targetConcerns,
    }).reasons,
    isActive: product.isActive,
    isRecommendable: product.isRecommendable,
    availability: product.availability,
    lastSyncedAt: product.lastSyncedAt,
    organizationId: product.organizationId,
  }
}

function fetchProducts() {
  return prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      brand: true,
      imageUrl: true,
      source: true,
      externalId: true,
      category: true,
      primaryClassification: true,
      suitableSkinTypes: true,
      targetConcerns: true,
      cosmeticBenefits: true,
      climateTags: true,
      routineCategory: true,
      ingredients: true,
      priceCents: true,
      completenessScore: true,
      verificationStatus: true,
      classificationConfidence: true,
      intelligenceStale: true,
      intelligenceStatus: true,
      intelligenceError: true,
      intelligenceProvenance: true,
      sku: true,
      currency: true,
      storeUrl: true,
      isActive: true,
      isRecommendable: true,
      availability: true,
      lastSyncedAt: true,
      organizationId: true,
      _count: { select: { ingredientLinks: true } },
    },
  })
}

export async function loadCatalogueQuality(): Promise<{
  rows: ProductQualityRow[]
  health: CatalogueHealth
}> {
  const { isWooCommerceConfigured } = await import(
    "@/lib/products/ingest/woocommerce"
  )

  const [products, lastRun] = await Promise.all([
    withDbRetry(() => fetchProducts()),
    withDbRetry(() =>
      prisma.productSyncRun.findFirst({ orderBy: { startedAt: "desc" } }),
    ),
  ])

  const rows = products.map(toQualityRow)

  const bySource: Record<string, number> = {}
  for (const row of rows) {
    bySource[row.source] = (bySource[row.source] ?? 0) + 1
  }

  const byIntelligenceStatus: Record<string, number> = {}
  for (const row of rows) {
    byIntelligenceStatus[row.intelligenceStatus] =
      (byIntelligenceStatus[row.intelligenceStatus] ?? 0) + 1
  }

  const health: CatalogueHealth = {
    total: rows.length,
    byIntelligenceStatus,
    verified: rows.filter((row) => row.verificationStatus === "confirmed").length,
    unverified: rows.filter((row) => row.verificationStatus !== "confirmed").length,
    stale: rows.filter((row) => row.intelligenceStale).length,
    failed: rows.filter((row) => row.intelligenceStatus === "failed").length,
    eligible: rows.filter((row) => row.eligibilityReasons.length === 0).length,
    active: rows.filter((row) => row.isActive).length,
    recommendable: rows.filter((row) => row.isActive && row.isRecommendable).length,
    dataComplete: rows.filter((row) => row.missing.length === 0).length,
    aboveConfidenceThreshold: rows.filter(
      (row) => row.completenessScore >= CONFIDENT_RECOMMENDATION_THRESHOLD,
    ).length,
    needingExtraction: rows.filter(
      (row) => row.intelligenceStale || !row.primaryClassification,
    ).length,
    awaitingVerification: rows.filter(
      (row) => row.primaryClassification !== null && row.verificationStatus !== "confirmed",
    ).length,
    bySource,
    averageCompleteness:
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((sum, row) => sum + row.completenessScore, 0) / rows.length),
    lastSync: lastRun
      ? {
          id: lastRun.id,
          source: lastRun.source,
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          finishedAt: lastRun.finishedAt,
          discovered: lastRun.discovered,
          created: lastRun.created,
          updated: lastRun.updated,
          unchanged: lastRun.unchanged,
          archived: lastRun.archived,
          markedStale: lastRun.markedStale,
          failed: lastRun.failed,
          error: lastRun.error,
        }
      : null,
    wooCommerceConfigured: isWooCommerceConfigured(),
  }

  return { rows, health }
}
