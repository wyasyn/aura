import type { ProductClassification } from "@/generated/prisma/client"

import { PRODUCT_CLASSIFICATIONS } from "@/lib/products/schemas"

/**
 * Reading and writing the split classification.
 *
 * Storage separates the primary claim from the rest so a future engine can ask
 * "what is this, principally?" without guessing at array order. Most readers —
 * a prompt, a badge row — only want the whole set, and reconstructing it at
 * each call site is how the two halves drift apart.
 */

/**
 * The read shape, deliberately loose.
 *
 * Readers hand this whatever their Prisma select produced, and several type
 * those columns as plain strings. Requiring the enum here would push a cast
 * into every call site for no gain: the database already guarantees the values
 * are members, and nothing downstream of a read needs the narrower type.
 */
export type ClassificationRecord = {
  primaryClassification: string | null
  secondaryClassifications: string[]
}

/**
 * Every classification a product carries, primary first.
 *
 * Empty means unclassified, which stays distinct from `["other"]`: one says
 * nobody has judged the product, the other says it was judged and fits nothing.
 */
export function allClassifications(product: ClassificationRecord): string[] {
  if (!product.primaryClassification) return [...product.secondaryClassifications]
  return [
    product.primaryClassification,
    ...product.secondaryClassifications.filter(
      (value) => value !== product.primaryClassification,
    ),
  ]
}

/**
 * Splits a flat selection into the stored shape.
 *
 * The first entry becomes primary. That is a real decision rather than an
 * arbitrary one: a form presents these in a fixed order, so "the first one
 * chosen" is not meaningful — callers that care which is primary should say so
 * explicitly rather than relying on selection order.
 */
export function splitClassifications(
  values: readonly ProductClassification[],
  primary?: ProductClassification | null,
): {
  primaryClassification: ProductClassification | null
  secondaryClassifications: ProductClassification[]
} {
  const unique = [...new Set(values)]

  const chosen =
    primary && unique.includes(primary) ? primary : (unique[0] ?? null)

  return {
    primaryClassification: chosen,
    secondaryClassifications: unique.filter((value) => value !== chosen),
  }
}

/** Type guard for values arriving as plain strings from a form or an import. */
export function isProductClassification(
  value: string,
): value is ProductClassification {
  return (PRODUCT_CLASSIFICATIONS as readonly string[]).includes(value)
}
