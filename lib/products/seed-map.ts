import { parseInciList } from "@/lib/products/parse-inci"

export type FallbackProduct = {
  name: string
  description: string
  short_description: string
  price: string
  regular_price: string
  categories: string[]
  tags: string[]
  ingredients_highlight: string
  image_url: string
  product_url: string
}

const TAG_TO_CONCERN: Array<{ pattern: RegExp; concern: string }> = [
  { pattern: /antihairfall|hair.?fall|hairfall/i, concern: "hair_fall" },
  { pattern: /dandruff/i, concern: "dandruff" },
  { pattern: /hydrat|moistur|dry/i, concern: "dryness" },
  { pattern: /acne|blemish/i, concern: "acne" },
  { pattern: /aging|anti.?age|wrinkle/i, concern: "aging" },
  { pattern: /redness|rosacea/i, concern: "redness" },
  { pattern: /pigment|brighten|dark.?spot/i, concern: "hyperpigmentation" },
  { pattern: /sensitive|allerg/i, concern: "sensitivity" },
  { pattern: /texture|rough/i, concern: "texture" },
  { pattern: /oil|sebum|tzone|t-zone/i, concern: "oiliness" },
  { pattern: /barrier|repair|heal/i, concern: "barrier_support" },
  { pattern: /hairoil|hair/i, concern: "hydration" },
]

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
}

export function slugFromProductUrl(productUrl: string): string {
  try {
    const pathname = new URL(productUrl).pathname
    const segment = pathname.split("/").filter(Boolean).pop()
    if (segment) return slugify(segment)
  } catch {
    // fall through
  }
  return ""
}

export function inferTargetConcerns(tags: string[], description: string): string[] {
  const haystack = [...tags, description].join(" ").toLowerCase()
  const concerns = new Set<string>()

  for (const { pattern, concern } of TAG_TO_CONCERN) {
    if (pattern.test(haystack)) {
      concerns.add(concern)
    }
  }

  return [...concerns]
}

export function buildDescription(item: FallbackProduct): string {
  const lines: string[] = []

  if (
    item.short_description &&
    item.short_description.trim() !== item.name.trim()
  ) {
    lines.push(item.short_description.trim())
  }

  lines.push(item.description.trim())

  if (item.categories.length > 1) {
    lines.push(`Also: ${item.categories.slice(1).join(", ")}`)
  }

  return lines.join("\n\n").slice(0, 5000)
}

export function inferClimateTags(tags: string[], description: string): string[] {
  const haystack = [...tags, description].join(" ").toLowerCase()
  const climateTags = new Set<string>()

  if (/spf|sun\s?screen|uv|solar/i.test(haystack)) {
    climateTags.add("high_uv")
  }
  if (/humid|monsoon|tropical|dewy/i.test(haystack)) {
    climateTags.add("humid")
  }
  if (/dry|dehydrat|arid|barrier/i.test(haystack)) {
    climateTags.add("dry")
  }
  if (/cold|winter|chap|frost/i.test(haystack)) {
    climateTags.add("cold")
  }
  if (/pollut|urban|city\s?smog|detox/i.test(haystack)) {
    climateTags.add("polluted")
  }

  return [...climateTags]
}

export function mapFallbackProduct(item: FallbackProduct) {
  const slug =
    slugFromProductUrl(item.product_url) || slugify(item.name)
  const category = item.categories[0] ?? "general"
  const ingredients =
    item.ingredients_highlight &&
    !/not specified/i.test(item.ingredients_highlight)
      ? item.ingredients_highlight
      : undefined
  const parsed = parseInciList(ingredients ?? null)

  return {
    sku: slug.toUpperCase().replace(/-/g, "_").slice(0, 64),
    name: item.name,
    slug,
    description: buildDescription(item),
    category,
    ingredients,
    ingredientList: parsed.isLikelyInciList ? parsed.items : [],
    targetConcerns: inferTargetConcerns(item.tags, item.description),
    suitableSkinTypes: [] as string[],
    climateTags: inferClimateTags(item.tags, item.description),
    imageUrl: item.image_url || undefined,
    storeUrl: item.product_url || undefined,
    isActive: true,
  }
}
