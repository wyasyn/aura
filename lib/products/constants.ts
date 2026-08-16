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

export const AURORA_STORE_ORIGIN = "https://www.auroraorganics.co"
