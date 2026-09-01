import { prisma } from "@/lib/db/client"
import { allClassifications } from "@/lib/products/classification"
import {
  currentCatalogueScope,
  visibleProductsWhere,
} from "@/lib/products/catalogue-scope"
import { resolveStoreUrl } from "@/lib/products/store-url"
import { filterCatalogRecommendations } from "@/lib/products/validate-catalog-recommendations"
import type { ProductRecommendation } from "@/lib/scan/types"

type CatalogProductFields = {
  slug: string
  name: string
  imageUrl: string | null
  storeUrl: string | null
  organizationId: string | null
  primaryClassification: string | null
  secondaryClassifications: string[]
}

/**
 * Resolves recommended slugs to the details shown to the patient.
 *
 * Tenant-scoped like every other product read. This one runs after the model
 * has already chosen, which makes it the easiest place to leak by accident: an
 * unscoped lookup here would happily attach another clinic's product name and
 * image to a recommendation, and it reads like presentation code.
 */
async function getCatalogProductMap(
  slugs: string[],
): Promise<Map<string, CatalogProductFields>> {
  if (slugs.length === 0) {
    return new Map()
  }

  const scope = await currentCatalogueScope()
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, ...visibleProductsWhere(scope) },
    select: {
      slug: true,
      name: true,
      imageUrl: true,
      storeUrl: true,
      organizationId: true,
      primaryClassification: true,
      secondaryClassifications: true,
    },
  })

  return new Map(products.map((product) => [product.slug, product]))
}

function applyCatalogFields(
  recommendations: ProductRecommendation[],
  catalogBySlug: Map<string, CatalogProductFields>,
): ProductRecommendation[] {
  return recommendations.map((item) => {
    const catalog = catalogBySlug.get(item.id)

    return {
      ...item,
      name: item.name ?? catalog?.name ?? item.id,
      imageUrl: item.imageUrl ?? catalog?.imageUrl ?? null,
      // Carried so the patient can see whose product this is. The organization
      // id itself never leaves the server — only which of the two catalogues
      // it came from, and the clinic's display name is resolved separately.
      source: catalog ? (catalog.organizationId ? "clinic" : "aurora") : undefined,
      classifications: catalog ? allClassifications(catalog) : undefined,
      storeUrl:
        item.storeUrl ??
        resolveStoreUrl({
          storeUrl: catalog?.storeUrl,
          slug: item.id,
        }),
    }
  })
}

/** Chat-safe enrich: keeps all valid catalog matches, never throws. */
export async function enrichChatProductRecommendations(
  recommendations: ProductRecommendation[],
): Promise<ProductRecommendation[]> {
  if (recommendations.length === 0) {
    return recommendations
  }

  const catalogBySlug = await getCatalogProductMap(
    recommendations.map((item) => item.id),
  )
  const valid = recommendations.filter((item) => catalogBySlug.has(item.id))
  return applyCatalogFields(valid, catalogBySlug)
}

export async function enrichRecommendationsWithImages(
  recommendations: ProductRecommendation[],
): Promise<ProductRecommendation[]> {
  if (recommendations.length === 0) {
    return recommendations
  }

  const catalogBySlug = await getCatalogProductMap(
    recommendations.map((item) => item.id),
  )
  const catalogSlugs = new Set(catalogBySlug.keys())
  const validated = filterCatalogRecommendations(
    recommendations,
    catalogSlugs,
    { minValid: 1, max: recommendations.length },
  )

  return applyCatalogFields(validated, catalogBySlug)
}

export async function enrichManyRecommendationsWithImages(
  recommendationGroups: ProductRecommendation[][],
): Promise<ProductRecommendation[][]> {
  const slugs = recommendationGroups.flatMap((group) =>
    group.map((item) => item.id),
  )

  const catalogBySlug = await getCatalogProductMap([...new Set(slugs)])

  return recommendationGroups.map((group) => {
    const catalogSlugs = new Set(catalogBySlug.keys())
    const validated = filterCatalogRecommendations(group, catalogSlugs, {
      minValid: 0,
      max: group.length,
    })
    return applyCatalogFields(validated, catalogBySlug)
  })
}
