/**
 * How much of a product's recommendation-relevant data is actually filled in.
 *
 * A recommendation engine cannot tell the difference between "this product does
 * not suit dry skin" and "nobody recorded which skin types it suits". Both look
 * like an absent match. This score is what lets a future engine treat the
 * second case as missing information rather than as a negative signal — and
 * lets an administrator see which products are dragging the catalogue down.
 *
 * Honest to state as a number because it counts populated fields rather than
 * judging their quality. It says how much is known, never how good it is.
 */

/** The shape scored. Deliberately structural, so it can be called on a form. */
export type ScorableProduct = {
  name?: string | null
  description?: string | null
  brand?: string | null
  imageUrl?: string | null
  primaryClassification?: string | null
  targetConcerns?: readonly string[] | null
  suitableSkinTypes?: readonly string[] | null
  cosmeticBenefits?: readonly string[] | null
  climateTags?: readonly string[] | null
  ingredientList?: readonly string[] | null
  ingredients?: string | null
  routineCategory?: string | null
  priceCents?: number | null
}

type Criterion = {
  key: string
  /** Relative importance. Weights are ordinal, not measured. */
  weight: number
  label: string
  met: (product: ScorableProduct) => boolean
}

const filled = (value: string | null | undefined) => Boolean(value?.trim())
const populated = (value: readonly string[] | null | undefined) =>
  Array.isArray(value) && value.length > 0

/**
 * The criteria, weighted by how much each matters to a recommendation.
 *
 * Concerns and skin types carry the most because they are what a match is
 * actually made on. An image carries little — it changes whether a card looks
 * finished, not whether the product suits anyone. Price is worth a point
 * because a budget preference cannot be honoured without it, but it is not
 * knowledge about the product's fit.
 */
const CRITERIA: readonly Criterion[] = [
  { key: "name", weight: 5, label: "Name", met: (p) => filled(p.name) },
  { key: "description", weight: 5, label: "Description", met: (p) => filled(p.description) },
  { key: "concerns", weight: 20, label: "Target concerns", met: (p) => populated(p.targetConcerns) },
  { key: "skinTypes", weight: 20, label: "Suitable skin types", met: (p) => populated(p.suitableSkinTypes) },
  { key: "classification", weight: 10, label: "Primary classification", met: (p) => filled(p.primaryClassification) },
  { key: "benefits", weight: 10, label: "Cosmetic benefits", met: (p) => populated(p.cosmeticBenefits) },
  {
    key: "ingredients",
    weight: 15,
    label: "Ingredients",
    // Either form counts: the parsed list is better, but the raw INCI text is
    // what the allergy filter falls back to and is enough to reason from.
    met: (p) => populated(p.ingredientList) || filled(p.ingredients),
  },
  { key: "climate", weight: 5, label: "Climate tags", met: (p) => populated(p.climateTags) },
  { key: "routine", weight: 5, label: "Routine category", met: (p) => filled(p.routineCategory) },
  { key: "brand", weight: 2, label: "Brand", met: (p) => filled(p.brand) },
  { key: "image", weight: 2, label: "Image", met: (p) => filled(p.imageUrl) },
  {
    key: "price",
    weight: 1,
    label: "Price",
    met: (p) => typeof p.priceCents === "number" && p.priceCents > 0,
  },
]

const TOTAL_WEIGHT = CRITERIA.reduce((sum, c) => sum + c.weight, 0)

export type CompletenessReport = {
  /** 0–100. */
  score: number
  /** Labels of everything still missing, worst-weighted first. */
  missing: string[]
}

/** Scores a product and names what is missing. */
export function assessCompleteness(product: ScorableProduct): CompletenessReport {
  let earned = 0
  const missing: Criterion[] = []

  for (const criterion of CRITERIA) {
    if (criterion.met(product)) earned += criterion.weight
    else missing.push(criterion)
  }

  return {
    score: Math.round((earned / TOTAL_WEIGHT) * 100),
    missing: missing
      .sort((a, b) => b.weight - a.weight)
      .map((criterion) => criterion.label),
  }
}

/** The score alone, for writing to Product.completenessScore. */
export function completenessScore(product: ScorableProduct): number {
  return assessCompleteness(product).score
}

/**
 * Whether a product knows enough about itself to be recommended confidently.
 *
 * Not enforced anywhere yet — the recommendation engine is a later phase. It is
 * defined here so the threshold is decided once, in the same place as the
 * scoring, rather than invented at the call site later.
 */
export const CONFIDENT_RECOMMENDATION_THRESHOLD = 60

export function isConfidentlyRecommendable(product: ScorableProduct): boolean {
  return completenessScore(product) >= CONFIDENT_RECOMMENDATION_THRESHOLD
}
