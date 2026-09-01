import { z } from "zod"

import { PRODUCT_BENEFIT_OPTIONS } from "@/lib/products/constants"

export const PRODUCT_CLASSIFICATIONS = [
  "organic",
  "natural",
  "synthetic",
  "dermatological",
  "ayurvedic",
  "clinical",
  "other",
] as const

export const ROUTINE_CATEGORIES = [
  "cleanser",
  "exfoliant",
  "toner",
  "essence",
  "serum",
  "treatment",
  "moisturiser",
  "oil",
  "mask",
  "sunscreen",
  "haircare",
  "bodycare",
  "other",
] as const

export const PRODUCT_AVAILABILITY = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "discontinued",
  "unknown",
] as const

/** Mirrors the ClimateBand enum UserLocation already stores. */
export const CLIMATE_BANDS = ["low", "moderate", "high", "extreme"] as const

export type ProductClassificationValue = (typeof PRODUCT_CLASSIFICATIONS)[number]

const productFields = {
  sku: z.string().max(64).optional(),
  slug: z.string().max(200).optional(),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().min(1, "Summary is required").max(5000),
  category: z.string().min(1, "Product type is required").max(120),
  ingredients: z.string().max(5000).optional(),
  targetConcerns: z.array(z.string()).default([]),
  suitableSkinTypes: z.array(z.string()).default([]),
  climateTags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().or(z.literal("")),
  storeUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
}

/**
 * The structured intelligence a product carries, shared by both editors.
 *
 * Defined once so the Aurora catalogue and a clinic's own catalogue describe
 * products the same way. A recommendation engine reading both cannot afford
 * them to diverge — a field the admin editor writes and the clinic editor does
 * not is a field the engine can only trust for half the catalogue.
 */
const intelligenceFields = {
  /**
   * Every classification that applies, and which of them is principal.
   *
   * Sent as a set plus a nominated primary rather than an ordered list: a
   * checkbox row has no meaningful order, so inferring the primary from
   * position would make it depend on the order the options happen to render in.
   */
  classifications: z.array(z.enum(PRODUCT_CLASSIFICATIONS)).default([]),
  primaryClassification: z.enum(PRODUCT_CLASSIFICATIONS).nullish(),
  cosmeticBenefits: z.array(z.enum(PRODUCT_BENEFIT_OPTIONS)).default([]),
  routineCategory: z.enum(ROUTINE_CATEGORIES).nullish(),
  brand: z.string().trim().max(120).optional(),
  priceCents: z.number().int().nonnegative().nullish(),
  currency: z.string().trim().length(3).nullish(),
  availability: z.enum(PRODUCT_AVAILABILITY).default("unknown"),
  suitableHumidity: z.array(z.enum(CLIMATE_BANDS)).default([]),
  suitableTemperature: z.array(z.enum(CLIMATE_BANDS)).default([]),
  suitableUv: z.array(z.enum(CLIMATE_BANDS)).default([]),
  environmentalNotes: z.string().trim().max(2000).optional(),
  isRecommendable: z.boolean().default(true),
}

/** What the admin UI submits — sku/slug optional (auto-generated on save). */
export const productFormSchema = z.object({
  ...productFields,
  ...intelligenceFields,
})

/** Full persisted shape after server normalization. */
export const productSchema = z.object({
  sku: z.string().min(1).max(64),
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1).max(120),
  ingredients: z.string().max(5000).optional(),
  targetConcerns: z.array(z.string()).default([]),
  suitableSkinTypes: z.array(z.string()).default([]),
  climateTags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().or(z.literal("")),
  storeUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
})

/**
 * What a clinic submits for one of its own products.
 *
 * Deliberately has no organizationId, isActive or ownership field of any kind.
 * A clinic product's owner comes from the session and archiving goes through
 * its own action, so neither "create this for another clinic" nor "make this an
 * Aurora product" can be expressed here at all — which is stronger than
 * validating them away.
 */
export const clinicProductFormSchema = z.object({
  sku: productFields.sku,
  slug: productFields.slug,
  name: productFields.name,
  description: productFields.description,
  category: productFields.category,
  ingredients: productFields.ingredients,
  targetConcerns: productFields.targetConcerns,
  suitableSkinTypes: productFields.suitableSkinTypes,
  climateTags: productFields.climateTags,
  imageUrl: productFields.imageUrl,
  storeUrl: productFields.storeUrl,
  ...intelligenceFields,
})

export type ProductFormInput = z.infer<typeof productFormSchema>
export type ProductInput = z.infer<typeof productSchema>
export type ClinicProductFormInput = z.infer<typeof clinicProductFormSchema>
