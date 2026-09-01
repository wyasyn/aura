/** Fixed PRD cosmetic skin assessment dimensions. */
export const SKIN_DIMENSION_IDS = [
  "texture_pores",
  "pigmentation",
  "redness",
  "wrinkles",
  "hydration",
  "aging_spots",
] as const

export type SkinDimensionId = (typeof SKIN_DIMENSION_IDS)[number]

export const SKIN_DIMENSIONS: ReadonlyArray<{
  id: SkinDimensionId
  label: string
}> = [
  { id: "texture_pores", label: "Texture & pores" },
  { id: "pigmentation", label: "Pigmentation & sun spots" },
  { id: "redness", label: "Redness & visible capillaries" },
  { id: "wrinkles", label: "Wrinkles & fine lines" },
  { id: "hydration", label: "Hydration" },
  { id: "aging_spots", label: "Aging & dark spots" },
] as const

/**
 * Observable criteria for each band, per dimension.
 *
 * Band assignment used to be described in one run-on sentence ("mild = mostly
 * balanced with minor support areas"), which is a judgement call the model
 * re-litigates on every run. The same face could come back mild on one scan and
 * moderate on the next. These criteria replace that with something countable,
 * so repeat scans of unchanged skin land on the same band.
 *
 * Bands are cosmetic concern levels, so lower is better. `not_assessed` is not
 * listed here: it means the photo could not support a judgement at all.
 */
export const DIMENSION_BAND_CRITERIA: Record<
  SkinDimensionId,
  Record<"minimal" | "mild" | "moderate" | "elevated", string>
> = {
  texture_pores: {
    minimal: "Surface reads smooth at conversational distance. Pores visible only on close inspection of the nose.",
    mild: "Slightly visible pores across the nose and inner cheeks. At most a few isolated blemishes or small rough patches.",
    moderate: "Pores clearly visible across the T-zone or cheeks, or scattered congestion and bumps across more than one facial zone.",
    elevated: "Widespread visible congestion, raised texture, or clustered blemish-prone areas across most of the face.",
  },
  pigmentation: {
    minimal: "Tone reads even across the face. No distinct patches stand apart from the surrounding skin.",
    mild: "One or two faint areas of uneven tone, or slight shadowing around the mouth or between the brows.",
    moderate: "Clearly defined patches of uneven tone across a zone such as the cheeks, forehead, or upper lip.",
    elevated: "Large or high-contrast areas of uneven tone across multiple zones, obvious at conversational distance.",
  },
  redness: {
    minimal: "Colour reads uniform. No flushing, and no visible vessels.",
    mild: "Slight warmth across the cheeks or around the nose, without defined edges.",
    moderate: "Clearly warmer zones with defined edges, or a few visible surface capillaries.",
    elevated: "Pronounced flushing across multiple zones, or clearly visible clusters of surface capillaries.",
  },
  wrinkles: {
    minimal: "No lines visible when the face is at rest.",
    mild: "Fine lines visible only in one area at rest, typically the outer eyes.",
    moderate: "Fine lines set at rest across two or more areas, such as outer eyes plus forehead or nasolabial folds.",
    elevated: "Deeper set lines at rest across multiple zones, visible independent of expression.",
  },
  hydration: {
    minimal: "Surface reads plump and light-reflective, with no flaking or crepe texture.",
    mild: "Slight dullness or one small area of surface dryness or flaking.",
    moderate: "Noticeable surface dryness, tightness, or fine crepe texture across a zone such as the cheeks.",
    elevated: "Widespread flaking, dullness, or crepe texture across most of the face.",
  },
  aging_spots: {
    minimal: "No discrete dark spots. Contours read firm.",
    mild: "One or two small, low-contrast spots, or very slight loss of definition along the jaw.",
    moderate: "Several discrete spots in one zone, or clear softening of contour along the jaw or under the eyes.",
    elevated: "Numerous or high-contrast discrete spots across multiple zones, with pronounced loss of contour definition.",
  },
}

/**
 * Short cosmetic phrase naming each dimension in user-facing headline copy.
 *
 * These are deliberately shorter than the dimension labels and contain no
 * internal "and", so two of them can be joined into one readable clause.
 */
export const DIMENSION_HEADLINE_PHRASE: Record<SkinDimensionId, string> = {
  texture_pores: "visible congestion",
  pigmentation: "uneven tone",
  redness: "visible redness",
  wrinkles: "fine lines",
  hydration: "surface dryness",
  aging_spots: "dark spots",
}

const DIMENSION_BY_ID = new Map(
  SKIN_DIMENSIONS.map((dimension) => [dimension.id, dimension]),
)

export function isSkinDimensionId(id: string): id is SkinDimensionId {
  return DIMENSION_BY_ID.has(id as SkinDimensionId)
}

export function getSkinDimensionLabel(id: SkinDimensionId): string {
  return DIMENSION_BY_ID.get(id)?.label ?? id
}
