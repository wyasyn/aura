import type { ProductRecommendation } from "@/lib/scan/types"

type ValidateCatalogRecommendationsOptions = {
  minValid?: number
  max?: number
}

export type CatalogSelection = {
  valid: ProductRecommendation[]
  /** Slugs the model invented that are not in the active catalog. */
  invalidSlugs: string[]
}

/**
 * Non-throwing sibling of {@link filterCatalogRecommendations}. Callers that
 * can repair a bad generation (by re-prompting) need to see what went wrong
 * rather than catching an opaque Error.
 */
export function selectCatalogRecommendations(
  recommendations: ProductRecommendation[],
  catalogSlugs: Set<string>,
  options: Pick<ValidateCatalogRecommendationsOptions, "max"> = {},
): CatalogSelection {
  const { max = 4 } = options
  const valid: ProductRecommendation[] = []
  const invalidSlugs: string[] = []

  for (const rec of recommendations) {
    if (catalogSlugs.has(rec.id)) {
      valid.push(rec)
    } else {
      invalidSlugs.push(rec.id)
    }
  }

  return { valid: valid.slice(0, max), invalidSlugs }
}

export function filterCatalogRecommendations(
  recommendations: ProductRecommendation[],
  catalogSlugs: Set<string>,
  options: ValidateCatalogRecommendationsOptions = {},
): ProductRecommendation[] {
  const { minValid = 2, max = 4 } = options
  const { valid } = selectCatalogRecommendations(recommendations, catalogSlugs, {
    max,
  })

  if (valid.length < minValid) {
    throw new Error("Model returned invalid product recommendations")
  }

  return valid
}

export async function getActiveCatalogSlugs(): Promise<Set<string>> {
  const { prisma } = await import("@/lib/db/client")
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
  })

  return new Set(products.map((product) => product.slug))
}
