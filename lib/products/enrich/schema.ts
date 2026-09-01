import { Type } from "@google/genai"
import { z } from "zod"

import {
  PRODUCT_BENEFIT_OPTIONS,
  PRODUCT_CLIMATE_TAGS,
  PRODUCT_CONCERN_OPTIONS,
  PRODUCT_SKIN_TYPE_OPTIONS,
} from "@/lib/products/constants"
import {
  CLIMATE_BANDS,
  PRODUCT_CLASSIFICATIONS,
  ROUTINE_CATEGORIES,
} from "@/lib/products/schemas"

/**
 * What an extraction pass is allowed to say about a product.
 *
 * Every field is drawn from a closed vocabulary Aurora already defines. The
 * model is reading a product description and picking from lists, not writing
 * free text that later has to be interpreted — an extracted value that is not
 * in the vocabulary is a value the engine could never score against, so there
 * is no point accepting it.
 *
 * Nothing here is a claim about a person. The model never sees a user, a scan
 * or a profile during enrichment; it sees a product's own marketing copy.
 */

/** The Gemini response schema. Mirrors {@link productExtractionSchema}. */
export const productExtractionJsonSchema = {
  type: Type.OBJECT,
  required: [
    "primaryClassification",
    "secondaryClassifications",
    "suitableSkinTypes",
    "cosmeticBenefits",
    "targetConcerns",
    "climateTags",
    "routineCategory",
    "amSuitable",
    "pmSuitable",
    "suitableHumidity",
    "suitableTemperature",
    "suitableUv",
    "brand",
    "keyIngredients",
  ],
  properties: {
    primaryClassification: {
      type: Type.STRING,
      enum: [...PRODUCT_CLASSIFICATIONS],
      description:
        "What this product principally is. Organic speaks to how inputs were farmed; natural to whether they were synthesised. Choose 'other' only when the description genuinely supports none of the rest.",
    },
    secondaryClassifications: {
      type: Type.ARRAY,
      description:
        "Further classifications that are also true. Must not repeat the primary. Empty when nothing else applies.",
      items: { type: Type.STRING, enum: [...PRODUCT_CLASSIFICATIONS] },
    },
    suitableSkinTypes: {
      type: Type.ARRAY,
      description:
        "Skin types the description supports. Empty when it says nothing about skin type — do not list all five to be safe.",
      items: { type: Type.STRING, enum: [...PRODUCT_SKIN_TYPE_OPTIONS] },
    },
    cosmeticBenefits: {
      type: Type.ARRAY,
      description:
        "What the product is claimed to do, in cosmetic language only. 'Supports the moisture barrier' is a cosmetic claim; 'repairs damaged skin' is not and must not be encoded.",
      items: { type: Type.STRING, enum: [...PRODUCT_BENEFIT_OPTIONS] },
    },
    targetConcerns: {
      type: Type.ARRAY,
      description:
        "Cosmetic concerns this product addresses according to its own description.",
      items: { type: Type.STRING, enum: [...PRODUCT_CONCERN_OPTIONS] },
    },
    climateTags: {
      type: Type.ARRAY,
      description:
        "Coarse climate conditions this product suits. Empty when the description gives no basis.",
      items: { type: Type.STRING, enum: [...PRODUCT_CLIMATE_TAGS] },
    },
    routineCategory: {
      type: Type.STRING,
      enum: [...ROUTINE_CATEGORIES],
      description:
        "Where this sits in a routine. Haircare and bodycare are available and are the right answer for hair oils, balms and body products — do not force a face category onto them.",
    },
    amSuitable: {
      type: Type.BOOLEAN,
      description: "Whether it is appropriate in a morning routine.",
    },
    pmSuitable: {
      type: Type.BOOLEAN,
      description: "Whether it is appropriate in an evening routine.",
    },
    suitableHumidity: {
      type: Type.ARRAY,
      description:
        "Humidity bands this suits. Empty says nothing rather than none.",
      items: { type: Type.STRING, enum: [...CLIMATE_BANDS] },
    },
    suitableTemperature: {
      type: Type.ARRAY,
      description: "Temperature bands this suits. Empty says nothing.",
      items: { type: Type.STRING, enum: [...CLIMATE_BANDS] },
    },
    suitableUv: {
      type: Type.ARRAY,
      description: "UV bands this suits. Empty says nothing.",
      items: { type: Type.STRING, enum: [...CLIMATE_BANDS] },
    },
    brand: {
      type: Type.STRING,
      nullable: true,
      description:
        "The maker, only if the description names one. Null otherwise — never guess, and never infer it from the store the product is sold in.",
    },
    keyIngredients: {
      type: Type.ARRAY,
      description:
        "INCI or common ingredient names the description actually names. Used to link the product to the ingredient reference table. Empty when none are named — do not infer likely ingredients from the product type.",
      items: { type: Type.STRING },
    },
  },
} as const

/**
 * Runtime validation of whatever comes back.
 *
 * The response schema constrains the model, but it is the model's own
 * cooperation that enforces it, and this data is written straight to columns
 * the recommendation engine reads. Anything not in the vocabulary is dropped
 * rather than rejected: one bad enum value in an array should cost that value,
 * not the whole product's enrichment.
 */
export const productExtractionSchema = z.object({
  primaryClassification: z.enum(PRODUCT_CLASSIFICATIONS).nullish(),
  secondaryClassifications: z.array(z.string()).default([]),
  suitableSkinTypes: z.array(z.string()).default([]),
  cosmeticBenefits: z.array(z.string()).default([]),
  targetConcerns: z.array(z.string()).default([]),
  climateTags: z.array(z.string()).default([]),
  routineCategory: z.enum(ROUTINE_CATEGORIES).nullish(),
  amSuitable: z.boolean().default(true),
  pmSuitable: z.boolean().default(true),
  suitableHumidity: z.array(z.string()).default([]),
  suitableTemperature: z.array(z.string()).default([]),
  suitableUv: z.array(z.string()).default([]),
  brand: z.string().nullish(),
  keyIngredients: z.array(z.string()).default([]),
})

export type ProductExtraction = z.infer<typeof productExtractionSchema>

/** Keeps only the members of a closed vocabulary, deduped and order-stable. */
export function keepKnown<T extends string>(
  values: string[],
  vocabulary: readonly T[],
): T[] {
  const allowed = new Set<string>(vocabulary)
  const seen = new Set<string>()
  const kept: T[] = []

  for (const value of values) {
    const normalized = value.trim().toLowerCase()
    if (!allowed.has(normalized) || seen.has(normalized)) continue
    seen.add(normalized)
    kept.push(normalized as T)
  }

  return kept
}
