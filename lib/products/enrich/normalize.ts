import type { ClimateBand, ProductClassification, RoutineCategory } from "@/generated/prisma/client"

import {
  PRODUCT_BENEFIT_OPTIONS,
  PRODUCT_CLIMATE_TAGS,
  PRODUCT_CONCERN_OPTIONS,
  PRODUCT_SKIN_TYPE_OPTIONS,
  ROUTINE_STEP_BY_CATEGORY,
} from "@/lib/products/constants"
import { CLIMATE_BANDS, PRODUCT_CLASSIFICATIONS } from "@/lib/products/schemas"
import { keepKnown, type ProductExtraction } from "@/lib/products/enrich/schema"

/**
 * Turns a model extraction into the columns to write.
 *
 * Pure and separately testable, because this is the boundary where a model's
 * output becomes data the recommendation engine will treat as fact. Everything
 * crossing it is checked against a closed vocabulary first.
 */

/** What the product already holds, for the fields enrichment can fill. */
export type ExistingProduct = {
  brand: string | null
  targetConcerns: string[]
  primaryClassification: ProductClassification | null
}

export type EnrichmentUpdate = {
  primaryClassification: ProductClassification | null
  secondaryClassifications: ProductClassification[]
  suitableSkinTypes: string[]
  cosmeticBenefits: string[]
  targetConcerns: string[]
  climateTags: string[]
  routineCategory: RoutineCategory | null
  routineStep: number | null
  amSuitable: boolean
  pmSuitable: boolean
  suitableHumidity: ClimateBand[]
  suitableTemperature: ClimateBand[]
  suitableUv: ClimateBand[]
  brand: string | null
  /** Never `confirmed`: no person checked this. */
  classificationConfidence: "unverified" | "imported"
}

export function toEnrichmentUpdate(
  extraction: ProductExtraction,
  existing: ExistingProduct,
): EnrichmentUpdate {
  const primary = extraction.primaryClassification ?? null

  // The primary is not repeated among the secondaries. The schema says so and
  // the model usually obeys, but "usually" is not a constraint.
  const secondary = keepKnown(
    extraction.secondaryClassifications,
    PRODUCT_CLASSIFICATIONS,
  ).filter((value) => value !== primary)

  const routineCategory = extraction.routineCategory ?? null

  // Concerns are merged, not replaced. Twenty of the twenty-four products were
  // already tagged by the WooCommerce import, and that data came from the
  // people who sell the product. An extraction pass reading the same marketing
  // copy is not grounds to discard it.
  const targetConcerns = [
    ...new Set([
      ...keepKnown(existing.targetConcerns, PRODUCT_CONCERN_OPTIONS),
      ...keepKnown(extraction.targetConcerns, PRODUCT_CONCERN_OPTIONS),
    ]),
  ]

  const brand = existing.brand?.trim() || extraction.brand?.trim() || null

  return {
    primaryClassification: primary,
    secondaryClassifications: secondary,
    suitableSkinTypes: keepKnown(
      extraction.suitableSkinTypes,
      PRODUCT_SKIN_TYPE_OPTIONS,
    ),
    cosmeticBenefits: keepKnown(extraction.cosmeticBenefits, PRODUCT_BENEFIT_OPTIONS),
    targetConcerns,
    climateTags: keepKnown(extraction.climateTags, PRODUCT_CLIMATE_TAGS),
    routineCategory,
    // Derived from the category, exactly as the admin editor derives it. A
    // model-supplied step would drift from the one a human entry produces for
    // the same category, and two products in one category must sort together.
    routineStep: routineCategory ? ROUTINE_STEP_BY_CATEGORY[routineCategory] : null,
    amSuitable: extraction.amSuitable,
    pmSuitable: extraction.pmSuitable,
    suitableHumidity: keepKnown(extraction.suitableHumidity, CLIMATE_BANDS),
    suitableTemperature: keepKnown(extraction.suitableTemperature, CLIMATE_BANDS),
    suitableUv: keepKnown(extraction.suitableUv, CLIMATE_BANDS),
    brand,
    // `imported` means an automated pass populated it and nobody has checked.
    // That is exactly what happened here, and it stays true however confident
    // the model sounded. Only a person may promote a product to `confirmed`.
    classificationConfidence: primary ? "imported" : "unverified",
  }
}
