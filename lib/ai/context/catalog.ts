import { unstable_cache } from "next/cache"
import { cache } from "react"

import { prisma } from "@/lib/db/client"
import type { CatalogProductContext } from "@/lib/ai/types"
import {
  CATALOG_CACHE_REVALIDATE_SECONDS,
  CATALOG_CONTEXT_TAG,
  tenantCatalogContextTag,
} from "@/lib/ai/context/cache-tags"
import { allClassifications } from "@/lib/products/classification"
import { resolveIngredientList } from "@/lib/products/parse-inci"
import { resolveStoreUrl } from "@/lib/products/store-url"
import {
  currentCatalogueScope,
  recommendableProductsWhere,
  type CatalogueScope,
} from "@/lib/products/catalogue-scope"
import { withDbRetry } from "@/lib/db/retry"

export { CATALOG_CONTEXT_TAG } from "@/lib/ai/context/cache-tags"

/**
 * The candidate products the model is allowed to recommend from.
 *
 * Split into two fetches on purpose. Aurora's catalogue is identical for every
 * request, so it stays behind one shared cache entry. A clinic's own products
 * are not, so they are cached under a tag of that clinic's own — a single cache
 * covering both would hand the first tenant's private catalogue to everyone
 * else who asked before the TTL expired.
 */

const PRODUCT_FIELDS = {
  slug: true,
  name: true,
  description: true,
  category: true,
  primaryClassification: true,
  secondaryClassifications: true,
  cosmeticBenefits: true,
  routineCategory: true,
  completenessScore: true,
  ingredients: true,
  ingredientList: true,
  targetConcerns: true,
  suitableSkinTypes: true,
  climateTags: true,
  storeUrl: true,
  organizationId: true,
} as const

type ProductRow = {
  slug: string
  name: string
  description: string
  category: string
  primaryClassification: string | null
  secondaryClassifications: string[]
  cosmeticBenefits: string[]
  routineCategory: string | null
  completenessScore: number
  ingredients: string | null
  ingredientList: string[]
  targetConcerns: string[]
  suitableSkinTypes: string[]
  climateTags: string[]
  storeUrl: string | null
  organizationId: string | null
}

function toContext(product: ProductRow): CatalogProductContext {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    classifications: allClassifications(product),
    cosmeticBenefits: product.cosmeticBenefits,
    routineCategory: product.routineCategory,
    completenessScore: product.completenessScore,
    // Tells the model which catalogue a product came from, so advice can say
    // "your clinic stocks this" without the model inventing the relationship.
    source: product.organizationId ? "clinic" : "aurora",
    ingredients: product.ingredients,
    ingredientList: resolveIngredientList(
      product.ingredientList,
      product.ingredients,
    ),
    targetConcerns: product.targetConcerns,
    suitableSkinTypes: product.suitableSkinTypes,
    climateTags: product.climateTags,
    purchaseUrl: resolveStoreUrl({
      storeUrl: product.storeUrl,
      slug: product.slug,
    }),
  }
}

async function fetchProducts(scope: CatalogueScope): Promise<CatalogProductContext[]> {
  const products = await withDbRetry(() =>
    prisma.product.findMany({
      where: recommendableProductsWhere(scope),
      orderBy: { name: "asc" },
      select: PRODUCT_FIELDS,
    }),
  )
  return products.map(toContext)
}

/** Aurora's catalogue. One cache entry, shared by every request. */
const getCachedGlobalCatalog = unstable_cache(
  () => fetchProducts(null),
  [CATALOG_CONTEXT_TAG],
  { tags: [CATALOG_CONTEXT_TAG], revalidate: CATALOG_CACHE_REVALIDATE_SECONDS },
)

/** One clinic's catalogue, cached under that clinic's own tag. */
function getCachedTenantCatalog(
  organizationId: string,
): Promise<CatalogProductContext[]> {
  const tag = tenantCatalogContextTag(organizationId)
  return unstable_cache(
    async () => {
      const all = await fetchProducts(organizationId)
      // The global half is already cached separately; keep only this clinic's
      // own rows so the two entries never duplicate each other.
      return all.filter((product) => product.source === "clinic")
    },
    [tag],
    { tags: [tag], revalidate: CATALOG_CACHE_REVALIDATE_SECONDS },
  )()
}

export const getCatalogContext = cache(
  async (): Promise<CatalogProductContext[]> => {
    const scope = await currentCatalogueScope()
    const global = await getCachedGlobalCatalog()
    if (!scope) return global

    const tenant = await getCachedTenantCatalog(scope)
    return [...global, ...tenant]
  },
)
