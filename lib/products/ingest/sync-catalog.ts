import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { revalidateCatalogContext } from "@/lib/ai/context/cache-tags"
import { prisma } from "@/lib/db/client"
import {
  fetchWooCommerceProducts,
  isWooCommerceConfigured,
} from "@/lib/products/ingest/woocommerce"
import { mapWooCommerceProduct } from "@/lib/products/ingest/map-woocommerce"
import {
  mapFallbackProduct,
  type FallbackProduct,
} from "@/lib/products/seed-map"
import type { CatalogSyncResult, IngestProductInput } from "@/lib/products/ingest/types"

const __dirname = dirname(fileURLToPath(import.meta.url))
const fallbackPath = join(
  __dirname,
  "../../../scripts/data/products_fallback.json",
)

async function loadFallbackProducts(): Promise<IngestProductInput[]> {
  const raw = readFileSync(fallbackPath, "utf8")
  const items = JSON.parse(raw) as FallbackProduct[]
  return items.map((item) => {
    const mapped = mapFallbackProduct(item)
    return {
      sku: mapped.sku,
      name: mapped.name,
      slug: mapped.slug,
      description: mapped.description,
      category: mapped.category,
      ingredients: mapped.ingredients,
      ingredientList: mapped.ingredientList,
      targetConcerns: mapped.targetConcerns,
      suitableSkinTypes: mapped.suitableSkinTypes,
      climateTags: mapped.climateTags,
      imageUrl: mapped.imageUrl,
      storeUrl: mapped.storeUrl,
    }
  })
}

async function loadIngestProducts(): Promise<{
  source: CatalogSyncResult["source"]
  products: IngestProductInput[]
}> {
  if (isWooCommerceConfigured()) {
    const wooProducts = await fetchWooCommerceProducts()
    return {
      source: "woocommerce",
      products: wooProducts.map(mapWooCommerceProduct),
    }
  }

  return {
    source: "fallback",
    products: await loadFallbackProducts(),
  }
}

export async function syncProductCatalog(
  createdById: string,
): Promise<CatalogSyncResult> {
  const { source, products } = await loadIngestProducts()

  let created = 0
  let updated = 0
  let skipped = 0

  for (const product of products) {
    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
      select: { id: true },
    })

    const data = {
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      ingredients: product.ingredients ?? null,
      ingredientList: product.ingredientList,
      targetConcerns: product.targetConcerns,
      suitableSkinTypes: product.suitableSkinTypes,
      climateTags: product.climateTags,
      imageUrl: product.imageUrl ?? null,
      storeUrl: product.storeUrl ?? null,
      isActive: true,
    }

    if (existing) {
      await prisma.product.update({
        where: { slug: product.slug },
        data,
      })
      updated += 1
    } else {
      await prisma.product.create({
        data: {
          ...data,
          slug: product.slug,
          createdById,
        },
      })
      created += 1
    }
  }

  revalidateCatalogContext()

  return {
    source,
    created,
    updated,
    skipped,
    total: products.length,
  }
}

export async function getCatalogSyncSourceLabel(): Promise<string> {
  return isWooCommerceConfigured() ? "woocommerce" : "fallback"
}
