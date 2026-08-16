import {
  inferClimateTags,
  inferTargetConcerns,
  slugify,
} from "@/lib/products/seed-map"
import { parseInciList } from "@/lib/products/parse-inci"
import type { WooCommerceProduct } from "@/lib/products/ingest/types"
import {
  extractIngredientsFromWooProduct,
} from "@/lib/products/ingest/woocommerce"
import type { IngestProductInput } from "@/lib/products/ingest/types"

function buildDescription(product: WooCommerceProduct): string {
  const lines: string[] = []

  if (product.short_description?.trim()) {
    lines.push(stripHtml(product.short_description).trim())
  }

  if (product.description?.trim()) {
    lines.push(stripHtml(product.description).trim())
  }

  return lines.join("\n\n").slice(0, 5000) || product.name
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
}

export function mapWooCommerceProduct(
  product: WooCommerceProduct,
): IngestProductInput {
  const slug = product.slug || slugify(product.name)
  const category = product.categories[0]?.name ?? "general"
  const tags = product.tags.map((tag: { name: string }) => tag.name)
  const description = buildDescription(product)
  const ingredients = extractIngredientsFromWooProduct(product)
  const parsed = parseInciList(ingredients ?? null)

  return {
    sku: `WOO-${product.id}`.slice(0, 64),
    name: product.name,
    slug,
    description,
    category,
    ingredients,
    ingredientList: parsed.isLikelyInciList ? parsed.items : [],
    targetConcerns: inferTargetConcerns(tags, description),
    suitableSkinTypes: [],
    climateTags: inferClimateTags(tags, description),
    imageUrl: product.images[0]?.src,
    storeUrl: product.permalink,
  }
}
