import type { ProductAvailability, ProductSource } from "@/generated/prisma/client"

/**
 * A WooCommerce product as the REST API returns it.
 *
 * Every field beyond `id` is optional in practice. Not every installation
 * populates SKUs, stock status, or meta data, and a mapper that assumes
 * otherwise fails on the first store that does not — so the type says so and
 * the mapper handles it.
 */
export type WooCommerceProduct = {
  id: number
  name: string
  slug: string
  permalink: string
  description: string
  short_description: string
  sku?: string
  /** Current effective price, as a decimal string. WooCommerce sends "" when unset. */
  price?: string
  regular_price?: string
  sale_price?: string
  /** `instock`, `outofstock`, or `onbackorder`. */
  stock_status?: string
  /** `publish`, `draft`, `pending`, `private`. */
  status?: string
  date_modified_gmt?: string
  categories: Array<{ name: string; slug: string }>
  tags: Array<{ name: string; slug: string }>
  images: Array<{ src: string }>
  attributes?: Array<{ name: string; options?: string[] }>
  meta_data?: Array<{ key: string; value: unknown }>
}

/**
 * One product as the ingestion pipeline sees it, whatever it came from.
 *
 * This is the convergence point the architecture depends on: a WooCommerce
 * product and a manually entered one both become this, and everything
 * downstream — normalisation, extraction, validation, persistence — reads only
 * this shape. The recommendation engine never learns which it was.
 *
 * Carries source data only. Nothing here is derived intelligence: the
 * classification, skin types, benefits and climate profile are produced later
 * by the extraction pass, from these fields.
 */
export type IngestProductInput = {
  source: ProductSource
  /** Stable identifier in the source system. Null for manual and fallback. */
  externalId: string | null
  sku: string
  name: string
  slug: string
  description: string
  category: string
  /** Free-text ingredient statement, only when the source actually supplied one. */
  ingredients?: string
  ingredientList: string[]
  imageUrl?: string
  storeUrl?: string
  priceCents?: number | null
  currency?: string | null
  availability?: ProductAvailability
  /** When the source system last reported a change. */
  sourceUpdatedAt?: Date | null
  /**
   * Whether the source lists this product as purchasable at all.
   *
   * A draft or private WooCommerce product is not withdrawn from Aurora — it is
   * marked inactive, because a product that returns to `publish` should come
   * back rather than be re-created with a new id and lose its history.
   */
  published?: boolean
  /**
   * Concern and climate hints the source's own tags support.
   *
   * Kept deliberately thin. These are read off explicit WooCommerce tags, not
   * inferred from prose — inference is the extraction pass's job, and doing it
   * here would make source data and derived intelligence indistinguishable.
   */
  targetConcerns: string[]
  climateTags: string[]
}

export type CatalogSyncResult = {
  source: ProductSource
  runId: string | null
  discovered: number
  created: number
  updated: number
  unchanged: number
  archived: number
  markedStale: number
  failed: number
  error?: string
}
