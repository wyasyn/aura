export type WooCommerceProduct = {
  id: number
  name: string
  slug: string
  permalink: string
  description: string
  short_description: string
  categories: Array<{ name: string; slug: string }>
  tags: Array<{ name: string; slug: string }>
  images: Array<{ src: string }>
  meta_data?: Array<{ key: string; value: unknown }>
}

export type IngestProductInput = {
  name: string
  slug: string
  description: string
  category: string
  ingredients?: string
  ingredientList: string[]
  targetConcerns: string[]
  suitableSkinTypes: string[]
  climateTags: string[]
  imageUrl?: string
  storeUrl?: string
  sku: string
}

export type CatalogSyncResult = {
  source: "woocommerce" | "fallback"
  created: number
  updated: number
  skipped: number
  total: number
}
