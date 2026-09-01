import type { ScoredCandidate } from "@/lib/recommendation/types"

/**
 * The reason a product was recommended, built from what the engine decided.
 *
 * Deterministic and complete on its own. Gemini phrases these better, but it is
 * an improvement to a sentence that already exists rather than the thing that
 * produces it — if the model call fails, times out, or returns nothing usable,
 * every recommendation still arrives with a true reason attached. That is the
 * whole point of the engine deciding: the explanation layer cannot take the
 * advice down with it.
 */

/**
 * Cosmetic phrasing for concern vocabulary.
 *
 * The system prompt forbids naming clinical conditions and requires cosmetic
 * language throughout — "uneven tone" rather than hyperpigmentation. A reason
 * assembled from raw slugs would break that rule in the one place nobody
 * reviews, so the mapping lives here and is the only way concerns reach prose.
 */
const CONCERN_PHRASES: Record<string, string> = {
  acne: "blemish-prone areas",
  oiliness: "congestion and shine",
  dryness: "dryness",
  redness: "visible redness",
  hyperpigmentation: "uneven tone",
  aging: "fine lines",
  sensitivity: "sensitivity",
  texture: "texture and pores",
  hydration: "hydration",
  barrier_support: "barrier support",
  hair_fall: "hair fall",
  dandruff: "flaking and scalp comfort",
}

export function concernPhrase(concern: string): string {
  const key = concern.trim().toLowerCase()
  // An unmapped concern falls back to its slug with underscores opened up,
  // rather than being dropped. A missing phrase is a gap in this table, and
  // silently omitting the concern would hide it while making the reason vaguer.
  return CONCERN_PHRASES[key] ?? key.replace(/_/g, " ")
}

/** Joins a list the way a person writes one: "a, b and c". */
export function listPhrase(items: string[]): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

/** How many concerns a single sentence can carry before it stops being read. */
const MAX_CONCERNS_IN_REASON = 2
const MAX_ACTIVES_IN_REASON = 2

/**
 * A true sentence about why this product was selected.
 *
 * Built only from what the engine actually established: the concerns the
 * product was scored against, and the actives the ingredient join confirms are
 * in it. Nothing here can assert something the data does not support, which is
 * what makes it safe to fall back to.
 */
export function deterministicReason(candidate: ScoredCandidate): string {
  const concerns = candidate.citableConcerns
    .slice(0, MAX_CONCERNS_IN_REASON)
    .map(concernPhrase)
  const actives = candidate.citableIngredients.slice(0, MAX_ACTIVES_IN_REASON)

  if (concerns.length === 0 && actives.length === 0) {
    // Reached only when a product was selected with no concern match at all,
    // which happens when the context asserts nothing and relevance could not
    // filter. Saying so is better than inventing a reason.
    return `Suggested from your clinic's catalogue as a general step.`
  }

  if (concerns.length === 0) {
    return `Contains ${listPhrase(actives)}.`
  }

  const addresses = `Selected for ${listPhrase(concerns)}`

  return actives.length > 0
    ? `${addresses}, with ${listPhrase(actives)}.`
    : `${addresses}.`
}

/**
 * Applies model-written prose over the deterministic reasons.
 *
 * A model reason is used only when it exists for a product the engine actually
 * selected and is not empty. Anything else keeps the deterministic sentence, so
 * a partial or malformed response degrades one reason rather than all of them.
 */
export function applyModelReasons(
  candidates: ScoredCandidate[],
  modelReasons: Map<string, string>,
): Map<string, string> {
  const reasons = new Map<string, string>()

  for (const candidate of candidates) {
    const slug = candidate.product.slug
    const written = modelReasons.get(slug)?.trim()
    reasons.set(slug, written || deterministicReason(candidate))
  }

  return reasons
}
