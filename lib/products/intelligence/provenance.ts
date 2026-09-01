/**
 * Where each intelligence field's current value came from.
 *
 * Recorded rather than inferred. An admin surface that displayed "AI extracted"
 * next to every field would be asserting something nobody established — some
 * values came from the merchant's own tags, some from an extraction, some from
 * an administrator typing over both. A field with no entry here is shown as
 * unrecorded, which is the truth for everything written before this existed.
 */

export const INTELLIGENCE_ORIGINS = ["source", "extraction", "admin"] as const

export type IntelligenceOrigin = (typeof INTELLIGENCE_ORIGINS)[number]

/** The intelligence fields worth tracking provenance for. */
export const PROVENANCE_FIELDS = [
  "primaryClassification",
  "secondaryClassifications",
  "suitableSkinTypes",
  "targetConcerns",
  "cosmeticBenefits",
  "climateTags",
  "suitableHumidity",
  "suitableTemperature",
  "suitableUv",
  "routineCategory",
  "ingredientList",
  "brand",
] as const

export type ProvenanceField = (typeof PROVENANCE_FIELDS)[number]

export type IntelligenceProvenance = Partial<Record<ProvenanceField, IntelligenceOrigin>>

const FIELD_SET = new Set<string>(PROVENANCE_FIELDS)
const ORIGIN_SET = new Set<string>(INTELLIGENCE_ORIGINS)

/**
 * Reads a stored provenance map.
 *
 * Validated entry by entry rather than against a record schema. A schema over
 * an enum key requires every key to be present, which rejects every map this
 * ever produces — provenance is written a few fields at a time, so a partial
 * map is the normal case and a complete one would be the anomaly.
 *
 * Unknown fields and unknown origins are dropped rather than failing the whole
 * map. This is display metadata: a stale entry from a renamed field should cost
 * one label, not the provenance of every other field on the product.
 */
export function readProvenance(stored: unknown): IntelligenceProvenance {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {}

  const result: IntelligenceProvenance = {}

  for (const [field, origin] of Object.entries(stored as Record<string, unknown>)) {
    if (!FIELD_SET.has(field)) continue
    if (typeof origin !== "string" || !ORIGIN_SET.has(origin)) continue
    result[field as ProvenanceField] = origin as IntelligenceOrigin
  }

  return result
}

/**
 * Marks fields as coming from one origin, keeping what is already recorded for
 * the rest.
 *
 * Merged rather than replaced because the steps write different fields: a sync
 * sets concerns and climate tags, an extraction sets classification and skin
 * types, an administrator corrects whichever they disagree with. Replacing
 * would erase the origin of every field the current step did not touch.
 */
export function markProvenance(
  existing: IntelligenceProvenance,
  fields: readonly ProvenanceField[],
  origin: IntelligenceOrigin,
): IntelligenceProvenance {
  const next: IntelligenceProvenance = { ...existing }
  for (const field of fields) {
    next[field] = origin
  }
  return next
}

/** Human label for an origin, or null when nothing was recorded. */
export function originLabel(origin: IntelligenceOrigin | undefined): string | null {
  switch (origin) {
    case "source":
      return "From store data"
    case "extraction":
      return "AI extracted"
    case "admin":
      return "Administrator"
    default:
      return null
  }
}

/**
 * The fields whose values differ between two records.
 *
 * Used to mark only what an administrator actually changed as theirs. Marking
 * every field on save would claim they reviewed the whole product when they
 * corrected one line, which is exactly the false confidence this table is meant
 * to remove.
 */
export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): ProvenanceField[] {
  return PROVENANCE_FIELDS.filter((field) => {
    const a = before[field]
    const b = after[field]
    if (Array.isArray(a) && Array.isArray(b)) {
      // Order-insensitive: reordering a chip list is not a correction.
      if (a.length !== b.length) return true
      const sortedA = [...a].map(String).sort()
      const sortedB = [...b].map(String).sort()
      return sortedA.some((value, index) => value !== sortedB[index])
    }
    return (a ?? null) !== (b ?? null)
  })
}
