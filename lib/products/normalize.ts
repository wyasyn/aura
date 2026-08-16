import type { ProductFormInput, ProductInput } from "@/lib/products/schemas"
import { parseInciList } from "@/lib/products/parse-inci"

export type NormalizedProductInput = ProductInput & {
  ingredientList: string[]
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function shortId() {
  return Math.random().toString(36).slice(2, 8)
}

export function buildProductSku(name: string): string {
  const base = slugify(name) || "product"
  return `aur-${base}-${shortId()}`.slice(0, 64)
}

export function buildProductSlug(name: string): string {
  const base = slugify(name) || "product"
  return `${base}-${shortId()}`.slice(0, 200)
}

type NormalizeOptions = {
  existingSku?: string
  existingSlug?: string
}

export function normalizeProductInput(
  input: ProductFormInput,
  options: NormalizeOptions = {},
): NormalizedProductInput {
  const slug =
    input.slug?.trim() ||
    options.existingSlug ||
    buildProductSlug(input.name)

  const sku =
    input.sku?.trim() ||
    options.existingSku ||
    buildProductSku(input.name)

  const ingredients = input.ingredients?.trim() ?? ""
  const parsed = parseInciList(ingredients || null)

  return {
    sku,
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    ingredients,
    ingredientList: parsed.isLikelyInciList ? parsed.items : [],
    targetConcerns: input.targetConcerns,
    suitableSkinTypes: input.suitableSkinTypes,
    climateTags: input.climateTags,
    imageUrl: input.imageUrl ?? "",
    storeUrl: input.storeUrl ?? "",
    isActive: input.isActive,
  }
}
