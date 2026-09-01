import type { ProductAvailability } from "@/generated/prisma/client"

import { parseInciList } from "@/lib/products/parse-inci"
import { inferClimateTags, inferTargetConcerns, slugify } from "@/lib/products/seed-map"
import type { IngestProductInput, WooCommerceProduct } from "@/lib/products/ingest/types"
import { extractIngredientsFromWooProduct } from "@/lib/products/ingest/woocommerce"

/**
 * WooCommerce product → the pipeline's source shape.
 *
 * Source data only. This reads what the store says and normalises its format;
 * it does not decide what the product *is*. Classification, skin types,
 * benefits, routine position and climate bands are derived later by the
 * extraction pass, from these fields — mixing the two here is what makes a
 * catalogue where nobody can tell a store fact from an inference.
 */

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/\n{3,}/g, "\n\n")
}

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

/**
 * WooCommerce decimal string to minor units.
 *
 * Returns null rather than 0 for an absent or unparseable price. Zero is a
 * price — free — and claiming one where the store stated none would be a
 * fabricated commercial fact.
 */
export function toPriceCents(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

/**
 * WooCommerce stock status to Aurora's availability vocabulary.
 *
 * An unrecognised or absent status maps to `unknown`, never to `in_stock`.
 * Guessing availability upward would let the engine recommend something the
 * store cannot sell.
 */
export function toAvailability(status: string | undefined): ProductAvailability {
  switch (status?.trim().toLowerCase()) {
    case "instock":
      return "in_stock"
    case "outofstock":
      return "out_of_stock"
    case "onbackorder":
      return "low_stock"
    default:
      return "unknown"
  }
}

function toDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null
  // WooCommerce sends GMT timestamps without a zone designator.
  const parsed = new Date(value.endsWith("Z") ? value : `${value}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * The tags a store explicitly applied, kept as hints.
 *
 * These read WooCommerce's own tag and category names. That is a statement the
 * merchant made about their product, which is source data — unlike reading the
 * prose and concluding something, which is extraction.
 */
function sourceTags(product: WooCommerceProduct): string[] {
  return [
    ...product.tags.map((tag) => tag.name),
    ...product.categories.map((category) => category.name),
  ]
}

export function mapWooCommerceProduct(
  product: WooCommerceProduct,
): IngestProductInput {
  const slug = product.slug || slugify(product.name)
  const category = product.categories[0]?.name ?? "general"
  const description = buildDescription(product)
  const ingredients = extractIngredientsFromWooProduct(product)
  const parsed = parseInciList(ingredients ?? null)
  const tags = sourceTags(product)

  return {
    source: "woocommerce",
    // The numeric id, not the SKU. A merchant may change or reuse a SKU; the
    // id is what WooCommerce guarantees stable, and it is what a re-sync must
    // match on so a rename updates the row instead of duplicating it.
    externalId: String(product.id),
    // The store's own SKU when it has one. Falls back to the previous
    // WOO-<id> convention so products synced before this change keep theirs.
    sku: (product.sku?.trim() || `WOO-${product.id}`).slice(0, 64),
    name: product.name,
    slug,
    description,
    category,
    ingredients,
    ingredientList: parsed.isLikelyInciList ? parsed.items : [],
    imageUrl: product.images[0]?.src,
    storeUrl: product.permalink,
    priceCents: toPriceCents(product.price ?? product.regular_price),
    currency: null,
    availability: toAvailability(product.stock_status),
    sourceUpdatedAt: toDate(product.date_modified_gmt),
    // Anything not published is carried through as inactive rather than
    // dropped, so a product returning to `publish` recovers its row and its
    // recommendation history instead of being created afresh.
    published: (product.status ?? "publish") === "publish",
    targetConcerns: inferTargetConcerns(tags, description),
    climateTags: inferClimateTags(tags, description),
  }
}
