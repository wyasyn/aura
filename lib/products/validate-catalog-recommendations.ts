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

/**
 * The slugs a recommendation is allowed to name.
 *
 * Scoped to the caller's tenant. This set is the allowlist the model's output
 * is checked against, so an unscoped version would accept another clinic's
 * slug as valid and carry it straight through to the patient.
 */
export async function getActiveCatalogSlugs(): Promise<Set<string>> {
  const { prisma } = await import("@/lib/db/client")
  const { currentCatalogueScope, recommendableProductsWhere } = await import(
    "@/lib/products/catalogue-scope"
  )

  const scope = await currentCatalogueScope()
  const products = await prisma.product.findMany({
    where: recommendableProductsWhere(scope),
    select: { slug: true },
  })

  return new Set(products.map((product) => product.slug))
}
