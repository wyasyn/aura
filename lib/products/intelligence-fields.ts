import type { ClinicProductFormInput, ProductFormInput } from "@/lib/products/schemas"
import { completenessScore } from "@/lib/products/completeness"
import { splitClassifications } from "@/lib/products/classification"
import { ROUTINE_STEP_BY_CATEGORY } from "@/lib/products/constants"

/**
 * Turns a submitted form into the intelligence columns to persist.
 *
 * One place, shared by the create and update paths, because these fields are
 * derived rather than copied: the classification is split, the routine step is
 * looked up from the category, and the completeness score is recomputed. Doing
 * that at two call sites is how a product ends up saved with a stale score.
 */
export function productIntelligenceFields(
  form: ClinicProductFormInput | ProductFormInput,
) {
  const classification = splitClassifications(
    form.classifications,
    form.primaryClassification ?? null,
  )

  const routineCategory = form.routineCategory ?? null

  return {
    brand: form.brand?.trim() || null,
    primaryClassification: classification.primaryClassification,
    secondaryClassifications: classification.secondaryClassifications,
    // Someone filled this in by hand, which is more than an import but less
    // than a checked label. Confirmed is set deliberately, not as a side effect
    // of saving a form.
    classificationConfidence: classification.primaryClassification
      ? ("imported" as const)
      : ("unverified" as const),
    cosmeticBenefits: form.cosmeticBenefits,
    routineCategory,
    // Derived, never typed in: two products in the same category must order
    // identically, and a hand-entered number drifts the moment someone guesses.
    routineStep: routineCategory ? ROUTINE_STEP_BY_CATEGORY[routineCategory] : null,
    suitableHumidity: form.suitableHumidity,
    suitableTemperature: form.suitableTemperature,
    suitableUv: form.suitableUv,
    environmentalNotes: form.environmentalNotes?.trim() || null,
    priceCents: form.priceCents ?? null,
    currency: form.currency?.trim().toUpperCase() || null,
    availability: form.availability,
    completenessScore: completenessScore({
      name: form.name,
      description: form.description,
      brand: form.brand,
      imageUrl: form.imageUrl,
      primaryClassification: classification.primaryClassification,
      targetConcerns: form.targetConcerns,
      suitableSkinTypes: form.suitableSkinTypes,
      cosmeticBenefits: form.cosmeticBenefits,
      climateTags: form.climateTags,
      ingredients: form.ingredients,
      routineCategory,
      priceCents: form.priceCents ?? null,
    }),
  }
}
