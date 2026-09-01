import type { CatalogProductContext } from "@/lib/ai/types"

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

type EnrichProductLinksOptions = {
  /**
   * Catalog slugs that already render as their own product card. Linking them
   * in prose too would show the same product twice.
   */
  excludeSlugs?: string[]
}

/** Wrap unlinked catalog product names with markdown purchase links. */
export function enrichProductLinks(
  text: string,
  catalog: CatalogProductContext[],
  options?: EnrichProductLinksOptions,
): string {
  let result = text
  const excluded = new Set(options?.excludeSlugs ?? [])
  const sorted = [...catalog]
    .filter((product) => !excluded.has(product.slug))
    .sort((a, b) => b.name.length - a.name.length)

  for (const product of sorted) {
    const escapedName = escapeRegExp(product.name)
    const alreadyLinked = new RegExp(`\\[${escapedName}\\]\\(`, "i").test(result)
    if (alreadyLinked) continue

    const standalone = new RegExp(`(?<!\\[)${escapedName}(?!\\]\\()`, "i")
    result = result.replace(
      standalone,
      `[${product.name}](${product.purchaseUrl})`,
    )
  }

  return result
}
