import { citableConcerns, MAX_CONCERN_STRENGTH } from "@/lib/recommendation/concerns"
import {
  concernStrengthsForSurface,
  productSurface,
  type ProductSurface,
} from "@/lib/recommendation/surface"
import type { ScoringWeights } from "@/lib/recommendation/weights"
import type {
  CandidateProduct,
  RecommendationContext,
  ScoreComponent,
  ScoredCandidate,
} from "@/lib/recommendation/types"

/**
 * The scoring matrix.
 *
 * Every axis returns a fit in 0–1 and the things it matched on. Keeping fit
 * separate from the weight is what makes a score explainable: "concern fit
 * 0.8 × weight 10" can be shown to a clinic tuning its matrix, where a single
 * number cannot. It is also what lets the weights be per-tenant data without
 * the arithmetic becoming tenant-specific.
 *
 * Pure. No database, no clock, no randomness — the same context and the same
 * catalogue must always produce the same ranking, or a stored recommendation
 * cannot be reproduced when someone asks why it was made.
 */

function lower(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean)
}

function overlap(a: string[], b: Set<string>): string[] {
  return [...new Set(lower(a).filter((value) => b.has(value)))]
}

/**
 * How well a product's declared concerns answer what this person asserts.
 *
 * Sums the strengths of the concerns matched, then normalises against the
 * strongest concerns present rather than against the product's own list. A
 * product declaring one concern that is this person's most pressing one should
 * score better than a product declaring six of which one applies weakly.
 */
function concernFit(
  product: CandidateProduct,
  strengths: Map<string, number>,
): { fit: number; matched: string[] } {
  if (strengths.size === 0) return { fit: 0, matched: [] }

  const matched = citableConcerns(product.targetConcerns, strengths)
  if (matched.length === 0) return { fit: 0, matched: [] }

  const earned = matched.reduce((sum, concern) => sum + (strengths.get(concern) ?? 0), 0)

  // Normalised against the top three asserted concerns. A product cannot be
  // expected to address everything, and dividing by the full set would mean a
  // person with many concerns saw uniformly low scores for every product.
  const top = [...strengths.values()].sort((a, b) => b - a).slice(0, 3)
  const ceiling = top.reduce((sum, value) => sum + value, 0) || MAX_CONCERN_STRENGTH

  return { fit: Math.min(1, earned / ceiling), matched }
}

function skinTypeFit(
  product: CandidateProduct,
  context: RecommendationContext,
): { fit: number; matched: string[] } {
  if (!context.skinType) return { fit: 0, matched: [] }
  // An empty list says nobody assessed it, not that it suits nobody. Scoring it
  // as a mismatch would penalise every product the enrichment pass was
  // correctly cautious about.
  if (product.suitableSkinTypes.length === 0) return { fit: 0, matched: [] }

  const skinType = context.skinType.trim().toLowerCase()
  const matches = lower(product.suitableSkinTypes).includes(skinType)

  return matches ? { fit: 1, matched: [skinType] } : { fit: 0, matched: [] }
}

function climateTagFit(
  product: CandidateProduct,
  context: RecommendationContext,
): { fit: number; matched: string[] } {
  if (context.climateTags.length === 0 || product.climateTags.length === 0) {
    return { fit: 0, matched: [] }
  }

  const active = new Set<string>(lower([...context.climateTags]))
  const matched = overlap(product.climateTags, active)

  return { fit: matched.length / active.size, matched }
}

/**
 * Band-level climate fit, against the same ClimateBand vocabulary a user's
 * location is recorded in.
 *
 * Coarser tags and measured bands are both scored because they carry different
 * information: a tag says "suits humid climates", a band says "suits high
 * humidity specifically". An empty band list on the product contributes
 * nothing rather than counting against it, for the same reason as skin types.
 */
function climateBandFit(
  product: CandidateProduct,
  context: RecommendationContext,
): { fit: number; matched: string[] } {
  const pairs: Array<[string | null, string[]]> = [
    [context.humidityBand, product.suitableHumidity],
    [context.temperatureBand, product.suitableTemperature],
    [context.uvBand, product.suitableUv],
  ]

  const comparable = pairs.filter(([band, suitable]) => band && suitable.length > 0)
  if (comparable.length === 0) return { fit: 0, matched: [] }

  const matched: string[] = []
  for (const [band, suitable] of comparable) {
    if (band && lower(suitable).includes(band.toLowerCase())) {
      matched.push(band)
    }
  }

  return { fit: matched.length / comparable.length, matched }
}

/**
 * Evidence from what is actually in the product.
 *
 * Only key actives count. A recommendation whose stated reason is "contains a
 * solvent" is not a reason, and the join already marks which ingredients are
 * citable. This is the axis that separates a product that happens to be tagged
 * for dryness from one demonstrably built around a humectant.
 */
function ingredientFit(
  product: CandidateProduct,
  strengths: Map<string, number>,
): { fit: number; matched: string[] } {
  if (strengths.size === 0) return { fit: 0, matched: [] }

  const actives = product.ingredientLinks.filter((link) => link.isKeyActive)
  if (actives.length === 0) return { fit: 0, matched: [] }

  const matched: string[] = []
  for (const active of actives) {
    if (lower(active.targetConcerns).some((concern) => strengths.has(concern))) {
      matched.push(active.displayName ?? active.inciName)
    }
  }

  if (matched.length === 0) return { fit: 0, matched: [] }

  // Two corroborating actives is meaningfully better than one; five is not
  // meaningfully better than three, and treating it as such would reward long
  // ingredient lists over relevant ones.
  return { fit: Math.min(1, matched.length / 2), matched }
}

function benefitFit(
  product: CandidateProduct,
  context: RecommendationContext,
): { fit: number; matched: string[] } {
  if (context.goals.length === 0 || product.cosmeticBenefits.length === 0) {
    return { fit: 0, matched: [] }
  }

  const goals = new Set<string>(lower(context.goals))
  const matched = overlap(product.cosmeticBenefits, goals)

  return { fit: matched.length / goals.size, matched }
}

function doshaFit(
  product: CandidateProduct,
  context: RecommendationContext,
): { fit: number; matched: string[] } {
  // `balanced` is the absence of a lean, not a lean to match against.
  if (!context.dosha || context.dosha === "balanced") return { fit: 0, matched: [] }

  const dosha = context.dosha.trim().toLowerCase()
  const matched = product.ingredientLinks
    .filter((link) => lower(link.doshaAffinities).includes(dosha))
    .map((link) => link.displayName ?? link.inciName)

  return matched.length > 0 ? { fit: 1, matched: [dosha] } : { fit: 0, matched: [] }
}

/**
 * How far the score can be trusted, as a multiplier in (0, 1].
 *
 * Deliberately not an axis. Data quality is not a reason to recommend
 * something — a thoroughly documented moisturiser is not a better answer to
 * acne than a sparsely documented cleanser — so it scales the score a match
 * earned rather than adding to it.
 */
export function confidenceMultiplier(
  product: CandidateProduct,
  weights: ScoringWeights,
): number {
  const floor = weights.completenessFloor
  const completeness = floor + (1 - floor) * (product.completenessScore / 100)

  const confirmed = product.classificationConfidence === "confirmed"
  const confidence = confirmed ? 1 : weights.unconfirmedFactor

  return completeness * confidence
}

export function scoreProduct(
  product: CandidateProduct,
  context: RecommendationContext,
  weights: ScoringWeights,
  /** Injected by scoreCatalogue so the three surface views are built once. */
  strengthsBySurface?: Map<ProductSurface, Map<string, number>>,
): ScoredCandidate {
  // Scored against the concerns that may justify this product's surface, not
  // against everything the person asserts. A face scan is evidence about a
  // face; it cannot recommend a scalp oil.
  const surface = productSurface(product.routineCategory)
  const strengths =
    strengthsBySurface?.get(surface) ??
    concernStrengthsForSurface(context.concerns, surface)

  const axes: Array<[string, number, { fit: number; matched: string[] }]> = [
    ["concernMatch", weights.concernMatch, concernFit(product, strengths)],
    ["skinTypeFit", weights.skinTypeFit, skinTypeFit(product, context)],
    ["climateFit", weights.climateFit, climateTagFit(product, context)],
    ["climateBandFit", weights.climateBandFit, climateBandFit(product, context)],
    ["ingredientEvidence", weights.ingredientEvidence, ingredientFit(product, strengths)],
    ["benefitAlignment", weights.benefitAlignment, benefitFit(product, context)],
    ["doshaAffinity", weights.doshaAffinity, doshaFit(product, context)],
  ]

  const components: ScoreComponent[] = axes.map(([axis, weight, result]) => ({
    axis,
    fit: round(result.fit),
    weight,
    points: round(result.fit * weight),
    matched: result.matched,
  }))

  const rawScore = round(components.reduce((sum, c) => sum + c.points, 0))
  const multiplier = confidenceMultiplier(product, weights)

  return {
    product,
    rawScore,
    multiplier: round(multiplier),
    score: round(rawScore * multiplier),
    components,
    citableConcerns: citableConcerns(product.targetConcerns, strengths),
    citableIngredients:
      components.find((c) => c.axis === "ingredientEvidence")?.matched ?? [],
  }
}

/** The three surface views, built once per run rather than once per product. */
export function surfaceStrengths(
  context: RecommendationContext,
): Map<ProductSurface, Map<string, number>> {
  return new Map(
    (["face", "hair", "body"] as const).map((surface) => [
      surface,
      concernStrengthsForSurface(context.concerns, surface),
    ]),
  )
}

/** Four decimal places. Enough to break ties, few enough to compare exactly. */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

export function scoreCatalogue(
  products: CandidateProduct[],
  context: RecommendationContext,
  weights: ScoringWeights,
): ScoredCandidate[] {
  const bySurface = surfaceStrengths(context)
  return products.map((product) =>
    scoreProduct(product, context, weights, bySurface),
  )
}
