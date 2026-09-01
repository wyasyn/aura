/**
 * Read-only WooCommerce connectivity and shape check.
 *
 * Run: npm run woo:check
 *
 * Writes nothing, to the store or to Aurora. It answers three questions before
 * anyone runs a sync: are credentials configured, does the store answer, and
 * which of the fields the ingestion pipeline wants are actually present on this
 * installation. Not every WooCommerce install populates every field, and
 * finding that out during a write is the expensive way to find out.
 *
 * Never prints the consumer key or secret.
 */
import "dotenv/config"
import { config } from "dotenv"

config({ path: ".env.local", override: true })

import {
  buildAuthHeader,
  getWooCommerceConfig,
} from "../lib/products/ingest/woocommerce"

type Probe = Record<string, unknown>

function present(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

async function main() {
  const wooConfig = getWooCommerceConfig()

  if (!wooConfig) {
    console.log(
      "WooCommerce is NOT configured.\n" +
        "Set WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET to enable sync.\n" +
        "The catalogue falls back to scripts/data/products_fallback.json.",
    )
    process.exitCode = 1
    return
  }

  // The store URL is not a secret and is the one thing worth echoing, because
  // pointing at the wrong store is the most likely misconfiguration.
  console.log(`Store: ${wooConfig.storeUrl}`)
  console.log(`Credentials: present (not shown)\n`)

  const url = new URL("/wp-json/wc/v3/products", wooConfig.storeUrl)
  url.searchParams.set("per_page", "5")
  url.searchParams.set("status", "publish")

  const started = Date.now()
  const response = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(wooConfig),
      Accept: "application/json",
    },
  })

  console.log(`GET /wp-json/wc/v3/products → ${response.status} in ${Date.now() - started}ms`)

  if (!response.ok) {
    const body = await response.text()
    console.log(`\nStore refused the request:\n${body.slice(0, 400)}`)
    process.exitCode = 1
    return
  }

  const total = response.headers.get("x-wp-total")
  const pages = response.headers.get("x-wp-totalpages")
  console.log(`Store reports ${total ?? "?"} published products across ${pages ?? "?"} pages\n`)

  const sample = (await response.json()) as Probe[]
  if (sample.length === 0) {
    console.log("The store returned no products.")
    return
  }

  // Every field the ingestion pipeline reads, counted across the sample rather
  // than checked on one product — a single item says nothing about whether a
  // field is populated generally.
  const fields = [
    "id",
    "sku",
    "name",
    "slug",
    "permalink",
    "description",
    "short_description",
    "price",
    "regular_price",
    "sale_price",
    "stock_status",
    "status",
    "categories",
    "tags",
    "images",
    "attributes",
    "meta_data",
    "variations",
  ]

  console.log(`Field coverage across ${sample.length} sampled products:`)
  for (const field of fields) {
    const count = sample.filter((product) => present(product[field])).length
    const mark = count === sample.length ? "✓" : count === 0 ? "✗" : "~"
    console.log(`  ${mark} ${field.padEnd(20)} ${count}/${sample.length}`)
  }

  const first = sample[0]
  console.log(`\nFirst product:`)
  console.log(`  id=${first.id} sku=${JSON.stringify(first.sku)} slug=${JSON.stringify(first.slug)}`)
  console.log(`  name=${JSON.stringify(first.name)}`)
  console.log(`  price=${JSON.stringify(first.price)} stock_status=${JSON.stringify(first.stock_status)} status=${JSON.stringify(first.status)}`)
  const categories = (first.categories as Array<{ name: string }> | undefined) ?? []
  console.log(`  categories=${categories.map((c) => c.name).join(", ") || "(none)"}`)
  const meta = (first.meta_data as Array<{ key: string }> | undefined) ?? []
  console.log(`  meta_data keys=${meta.map((m) => m.key).slice(0, 12).join(", ") || "(none)"}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
