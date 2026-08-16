import { prisma } from "@/lib/db/client"
import { productIngredientListConflictsWithAllergies } from "@/lib/products/match-allergies"
import type { ProductRecommendation } from "@/lib/scan/types"

export type AllergyPartition = {
  /** Recommendations with no known conflict against the user's allergies. */
  safe: ProductRecommendation[]
  /** Recommendations dropped because an ingredient matched a stated allergy. */
  excluded: ProductRecommendation[]
}

/**
 * Splits recommendations into allergy-safe and excluded sets.
 *
 * A product whose slug is not in the catalog is treated as unsafe rather than
 * waved through: we cannot check ingredients we do not have.
 */
export async function partitionRecommendationsByAllergies(
  recommendations: ProductRecommendation[],
  allergies: string | null | undefined,
): Promise<AllergyPartition> {
  if (!allergies?.trim() || recommendations.length === 0) {
    return { safe: recommendations, excluded: [] }
  }

  const slugs = [...new Set(recommendations.map((item) => item.id))]
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      ingredientList: true,
      ingredients: true,
    },
  })

  const productBySlug = new Map(products.map((product) => [product.slug, product]))

  const safe: ProductRecommendation[] = []
  const excluded: ProductRecommendation[] = []

  for (const recommendation of recommendations) {
    const product = productBySlug.get(recommendation.id)
    const conflicts =
      !product || productIngredientListConflictsWithAllergies(product, allergies)

    if (conflicts) {
      excluded.push(recommendation)
    } else {
      safe.push(recommendation)
    }
  }

  return { safe, excluded }
}

/**
 * Returns only allergy-safe recommendations.
 *
 * This never falls back to the unfiltered list. An empty result is the correct
 * answer when every candidate conflicts with a stated allergy: showing a
 * conflicting product is worse than showing none.
 */
export async function filterRecommendationsByAllergies(
  recommendations: ProductRecommendation[],
  allergies: string | null | undefined,
): Promise<ProductRecommendation[]> {
  const { safe } = await partitionRecommendationsByAllergies(
    recommendations,
    allergies,
  )

  return safe
}
