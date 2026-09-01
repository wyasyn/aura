export const PRODUCT_CONCERN_OPTIONS = [
  "acne",
  "aging",
  "dryness",
  "redness",
  "hyperpigmentation",
  "sensitivity",
  "texture",
  "oiliness",
  "hair_fall",
  "dandruff",
  "hydration",
  "barrier_support",
] as const

export const PRODUCT_SKIN_TYPE_OPTIONS = [
  "oily",
  "dry",
  "combination",
  "sensitive",
  "normal",
] as const

export const PRODUCT_CLIMATE_TAGS = [
  "high_uv",
  "humid",
  "dry",
  "cold",
  "polluted",
] as const

export type ProductClimateTag = (typeof PRODUCT_CLIMATE_TAGS)[number]

/**
 * What a product is claimed to do.
 *
 * Deliberately cosmetic language. "Supports the moisture barrier" is a claim a
 * cosmetic product may make; "repairs damaged skin" is not, and vocabulary is
 * where that line is easiest to hold.
 *
 * Shared with Ingredient.benefits so a product's claims and the claims of what
 * is in it can be compared rather than merely coexisting.
 */
export const PRODUCT_BENEFIT_OPTIONS = [
  "hydration",
  "barrier_support",
  "soothing",
  "brightening",
  "smoothing",
  "oil_balancing",
  "gentle_cleansing",
  "uv_protection",
  "antioxidant_support",
  "conditioning",
  "scalp_comfort",
  "makeup_removal",
] as const

export type ProductBenefit = (typeof PRODUCT_BENEFIT_OPTIONS)[number]

/**
 * Routine order, low to high.
 *
 * Numbers rather than an implicit enum ordering, because the gaps matter: a
 * future engine placing a product between serum and moisturiser needs somewhere
 * to put it, and renumbering an enum would rewrite every stored value.
 */
export const ROUTINE_STEP_BY_CATEGORY = {
  cleanser: 10,
  exfoliant: 20,
  toner: 30,
  essence: 40,
  serum: 50,
  treatment: 60,
  moisturiser: 70,
  oil: 80,
  mask: 85,
  sunscreen: 90,
  haircare: 100,
  bodycare: 110,
  other: 120,
} as const

export const AURORA_STORE_ORIGIN = "https://www.auroraorganics.co"
