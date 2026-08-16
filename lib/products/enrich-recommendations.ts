import { prisma } from "@/lib/db/client"
import { resolveStoreUrl } from "@/lib/products/store-url"
import { filterCatalogRecommendations } from "@/lib/products/validate-catalog-recommendations"
import type { ProductRecommendation } from "@/lib/scan/types"

type CatalogProductFields = {
  slug: string
  name: string
  imageUrl: string | null
  storeUrl: string | null
}

async function getCatalogProductMap(
  slugs: string[],
): Promise<Map<string, CatalogProductFields>> {
  if (slugs.length === 0) {
    return new Map()
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: { slug: true, name: true, imageUrl: true, storeUrl: true },
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
