import type { ProductRecommendation } from "@/lib/scan/types"

/**
 * Fills slots the engine could not, from the model's own selection.
 *
 * This is the one place a model still influences which products a person sees,
 * and it exists because a catalogue too thin for the engine is better served by
 * a model's guess than by nothing. It is deliberately narrow:
 *
 * - It runs only when the engine reported itself unconfident.
 * - It takes at most the number of slots the engine left open.
 * - It cannot displace anything the engine chose.
 * - Every product it supplies still passes the allergy filter, because safety
 *   is not a preference the engine happens to apply and this path happens to
 *   skip.
 *
 * Every fill is counted on the scan's run row. A fallback nobody can count is a
 * fallback nobody can fix, and the risk with this design is precisely that it
 * bypasses the deterministic path exactly when data quality is worst.
 */

export type GapFillInput = {
  /** What the analysis model proposed, before the engine ran. */
  modelRecommendations: ProductRecommendation[]
  /** What the engine already selected. Never displaced. */
  alreadySelected: ProductRecommendation[]
  needed: number
  allergies: string | null
}

/**
 * The allergy check, resolved when it is needed rather than at import.
 *
 * The real filter reads the database to look ingredients up by slug, which
 * would make this whole module unimportable without one. It stays inside this
 * function rather than being lifted to the caller: a filter that runs on one
 * of two paths is a filter that does not run, and this is the path that exists
 * precisely because the engine's own safety pass never saw these products.
 */
type AllergyFilter = (
  recommendations: ProductRecommendation[],
  allergies: string | null,
) => Promise<ProductRecommendation[]>

async function defaultAllergyFilter(
  recommendations: ProductRecommendation[],
  allergies: string | null,
): Promise<ProductRecommendation[]> {
  const { filterRecommendationsByAllergies } = await import(
    "@/lib/products/filter-recommendations-by-allergies"
  )
  return filterRecommendationsByAllergies(recommendations, allergies)
}

export async function selectGapFills(
  input: GapFillInput,
  /** Injected only by tests, so the boundary rules can be checked without a database. */
  filterSafe: AllergyFilter = defaultAllergyFilter,
): Promise<ProductRecommendation[]> {
  if (input.needed <= 0 || input.modelRecommendations.length === 0) return []

  const taken = new Set(input.alreadySelected.map((item) => item.id))
  const candidates = input.modelRecommendations.filter((item) => !taken.has(item.id))
  if (candidates.length === 0) return []

  const safe = await filterSafe(candidates, input.allergies)

  return safe.slice(0, input.needed)
}
