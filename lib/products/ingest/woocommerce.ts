import { AURORA_STORE_ORIGIN } from "@/lib/products/constants"
import type { WooCommerceProduct } from "@/lib/products/ingest/types"

export type WooCommerceConfig = {
  storeUrl: string
  consumerKey: string
  consumerSecret: string
}

export function getWooCommerceConfig(): WooCommerceConfig | null {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL?.trim() || AURORA_STORE_ORIGIN
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim()
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim()

  if (!consumerKey || !consumerSecret) {
    return null
  }

  return { storeUrl, consumerKey, consumerSecret }
}

export function buildAuthHeader(config: WooCommerceConfig): string {
  const token = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64")
  return `Basic ${token}`
}

export function isWooCommerceConfigured(): boolean {
  return getWooCommerceConfig() !== null
}

export async function fetchWooCommerceProducts(): Promise<WooCommerceProduct[]> {
  const config = getWooCommerceConfig()
  if (!config) {
    throw new Error(
      "WooCommerce credentials are not configured. Set WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET.",
    )
  }

  const products: WooCommerceProduct[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const url = new URL("/wp-json/wc/v3/products", config.storeUrl)
    url.searchParams.set("per_page", String(perPage))
    url.searchParams.set("page", String(page))
    url.searchParams.set("status", "publish")

    const response = await fetch(url, {
      headers: {
        Authorization: buildAuthHeader(config),
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(
        `WooCommerce API failed (${response.status}): ${await response.text()}`,
      )
    }

    const batch = (await response.json()) as WooCommerceProduct[]
    products.push(...batch)

    if (batch.length < perPage) {
      break
    }

    page += 1
  }

  return products
}

export function extractIngredientsFromWooProduct(
  product: WooCommerceProduct,
): string | undefined {
  const metaKeys = [
    "ingredients",
    "ingredient_list",
    "inci",
    "ingredients_highlight",
    "_ingredients",
  ]

  for (const entry of product.meta_data ?? []) {
    if (
      metaKeys.includes(entry.key.toLowerCase()) &&
      typeof entry.value === "string" &&
      entry.value.trim()
    ) {
      return entry.value.trim()
    }
  }

  const haystack = `${product.short_description}\n${product.description}`
  const match = haystack.match(
    /(?:ingredients?|inci)\s*:?\s*([^<]+?)(?:<|$|\n\n)/i,
  )
  if (match?.[1]?.trim()) {
    return match[1].trim().slice(0, 5000)
  }

  return undefined
}
