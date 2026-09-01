import {
  getSkinDimensionLabel,
  isSkinDimensionId,
  SKIN_DIMENSION_IDS,
  type SkinDimensionId,
} from "@/lib/scan/dimensions"
import type { AssessmentBand, SkinDimension } from "@/lib/scan/types"

function findModelDimension(
  dimensions: SkinDimension[],
  id: SkinDimensionId,
): SkinDimension | undefined {
  const exact = dimensions.find((dimension) => dimension.id === id)
  if (exact) return exact

  const aliases: Record<SkinDimensionId, string[]> = {
    texture_pores: ["texture", "pores", "texture_and_pores"],
    pigmentation: ["sun_spots", "hyperpigmentation", "tone"],
    redness: ["capillaries", "visible_capillaries", "redness_capillaries"],
    wrinkles: ["fine_lines", "lines", "wrinkles_fine_lines"],
    hydration: ["moisture", "dehydration"],
    aging_spots: ["aging", "dark_spots", "age_spots"],
  }

  const candidates = new Set([id, ...aliases[id]])
  return dimensions.find((dimension) => candidates.has(dimension.id))
}

/** Ensures all six PRD dimensions are present with stable ids and labels. */
export function normalizeDimensions(
  dimensions: SkinDimension[],
): SkinDimension[] {
  return SKIN_DIMENSION_IDS.map((id) => {
    const fromModel = findModelDimension(dimensions, id)
    const band: AssessmentBand = fromModel?.band ?? "not_assessed"
    const note =
      fromModel?.note?.trim() ||
      (band === "not_assessed"
        ? "Not clearly visible in this photo."
        : "")

    return {
      id,
      label: getSkinDimensionLabel(id),
      band,
      note,
    }
  })
}

export function coerceDimensionId(id: string): SkinDimensionId | null {
  return isSkinDimensionId(id) ? id : null
}
