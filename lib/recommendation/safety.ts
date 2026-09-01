import { productIngredientListConflictsWithAllergies } from "@/lib/products/match-allergies"
import {
  concernStrengthsForSurface,
  productSurface,
  type ProductSurface,
} from "@/lib/recommendation/surface"
import type {
  CandidateProduct,
  ExcludedCandidate,
  RecommendationContext,
} from "@/lib/recommendation/types"

/**
 * The hard filters. Nothing here is a preference.
 *
 * These run before scoring, not after ranking, because a score is a statement
 * about fit and an excluded product has no fit to state. Running them
 * afterwards would also mean a high-scoring unsafe product silently displaces
 * a safe one from the shortlist, leaving fewer recommendations than the
 * catalogue could support.
 *
 * Every rule fails closed: when the data needed to clear a product is missing,
 * the product is excluded. Showing someone a product that conflicts with a
 * stated allergy is worse than showing them nothing.
 */

/** Availability states a product may still be recommended in. */
const RECOMMENDABLE_AVAILABILITY = new Set([
  "in_stock",
  "low_stock",
  // `unknown` is permitted: it is the default for every product nobody has set
  // a stock state on, and treating it as out of stock would empty the
  // catalogue rather than protect anyone.
  "unknown",
])

export type SafetyResult = {
  safe: CandidateProduct[]
  excluded: ExcludedCandidate[]
}

export function applySafetyFilters(
  products: CandidateProduct[],
  context: RecommendationContext,
): SafetyResult {
  const safe: CandidateProduct[] = []
  const excluded: ExcludedCandidate[] = []

  for (const product of products) {
    if (!product.isActive) {
      excluded.push({ slug: product.slug, reason: "inactive" })
      continue
    }

    // Separate from isActive on purpose: a clinic can withdraw a product from
    // new advice while keeping it listed, so reports a patient already holds
    // still resolve.
    if (!product.isRecommendable) {
      excluded.push({ slug: product.slug, reason: "not_recommendable" })
      continue
    }

    if (!RECOMMENDABLE_AVAILABILITY.has(product.availability)) {
      excluded.push({ slug: product.slug, reason: "unavailable" })
      continue
    }

    const conflict = allergyConflict(product, context.allergies)
    if (conflict) {
      excluded.push({
        slug: product.slug,
        reason: "allergy_conflict",
        detail: conflict,
      })
      continue
    }

    safe.push(product)
  }

  return { safe, excluded }
}

/**
 * The stated allergy a product conflicts with, or null.
 *
 * Reuses the existing matcher rather than restating the rule, so the engine and
 * the current post-generation filter can never disagree about what conflicts.
 */
export function allergyConflict(
  product: CandidateProduct,
  allergies: string | null,
): string | null {
  if (!allergies?.trim()) return null

  const conflicts = productIngredientListConflictsWithAllergies(
    { ingredientList: product.ingredientList, ingredients: product.ingredients },
    allergies,
  )

  if (!conflicts) return null

  // The specific term is recorded rather than the whole stated string, so an
  // exclusion can be explained without echoing everything someone disclosed.
  return matchedAllergyTerm(product, allergies) ?? "stated allergy"
}

function matchedAllergyTerm(
  product: CandidateProduct,
  allergies: string,
): string | null {
  const terms = allergies
    .split(/[,;\n]/)
    .map((term) => term.trim())
    .filter(Boolean)

  for (const term of terms) {
    const conflicts = productIngredientListConflictsWithAllergies(
      { ingredientList: product.ingredientList, ingredients: product.ingredients },
      term,
    )
    if (conflicts) return term
  }

  return null
}

/**
 * Drops products that address nothing this person has.
 *
 * Separate from the safety pass because it is a relevance rule, not a safety
 * one, and because it needs a scored view of the concerns. A product surviving
 * here has at least one concern in common with the context; a product that
 * does not is not a weaker recommendation, it is not a recommendation.
 *
 * When the context asserts no concerns at all — a scan that found nothing at
 * moderate or above, on a profile that states nothing — this returns everything
 * rather than nothing. There is no relevance signal to filter on, and an empty
 * shortlist would be the engine claiming a certainty it does not have.
 */
export function requireConcernMatch(
  products: CandidateProduct[],
  context: RecommendationContext,
): SafetyResult {
  if (context.concernStrengths.size === 0) {
    return { safe: products, excluded: [] }
  }

  const safe: CandidateProduct[] = []
  const excluded: ExcludedCandidate[] = []

  // Restricted per surface, using the same rule scoring applies. A hair oil
  // matching a face scan's `dryness` is excluded here with a reason rather
  // than surviving to score zero, so the exclusion is explainable.
  const bySurface = new Map<ProductSurface, Map<string, number>>(
    (["face", "hair", "body"] as const).map((surface) => [
      surface,
      concernStrengthsForSurface(context.concerns, surface),
    ]),
  )

  for (const product of products) {
    const strengths =
      bySurface.get(productSurface(product.routineCategory)) ?? new Map()

    const matches = product.targetConcerns.some((concern) =>
      strengths.has(concern.trim().toLowerCase()),
    )

    if (matches) {
      safe.push(product)
    } else {
      excluded.push({ slug: product.slug, reason: "no_concern_match" })
    }
  }

  return { safe, excluded }
}
