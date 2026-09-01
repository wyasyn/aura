import type { ScoredCandidate } from "@/lib/recommendation/types"

/**
 * Turns scores into a shortlist.
 *
 * Two things separate this from a sort. Ties must break deterministically, or
 * the same scan produces different advice on a re-run and a stored ranking
 * cannot be reproduced. And a shortlist of four cleansers is a worse answer
 * than a cleanser, a serum and a moisturiser even when the four cleansers score
 * higher individually — a person is being given a routine, not a leaderboard.
 */

export const DEFAULT_MAX_RECOMMENDATIONS = 4
export const MIN_CONFIDENT_RECOMMENDATIONS = 2

/**
 * Below this a product is being recommended on almost nothing.
 *
 * Expressed against the concern axis: a product that matches no concern at all
 * scores zero there, and the remaining axes cannot lift it past this on their
 * own. It exists so the engine can return two products rather than four when
 * the catalogue only honestly supports two.
 */
export const MIN_SCORE = 1

export type RankOptions = {
  max?: number
  minScore?: number
  /**
   * Cap per routine category.
   *
   * One is right for a shortlist that will become a routine: two serums is a
   * choice the person now has to make, which is the job they came here to have
   * done. Null disables the constraint for callers that want a pure ranking.
   */
  maxPerCategory?: number | null
}

/**
 * Orders by score, then by fixed tiebreakers.
 *
 * Slug last and always. It is the only field guaranteed unique and stable, so
 * it is what makes the order total — without it, two products scoring
 * identically would come out in whatever order the database happened to
 * return, and "why did this change?" would have no answer.
 */
export function compareCandidates(a: ScoredCandidate, b: ScoredCandidate): number {
  if (b.score !== a.score) return b.score - a.score

  // A product whose actives corroborate the match is the better answer when the
  // totals are level, because its reason survives scrutiny.
  if (b.citableIngredients.length !== a.citableIngredients.length) {
    return b.citableIngredients.length - a.citableIngredients.length
  }

  if (b.product.completenessScore !== a.product.completenessScore) {
    return b.product.completenessScore - a.product.completenessScore
  }

  return a.product.slug.localeCompare(b.product.slug)
}

export type RankResult = {
  selected: ScoredCandidate[]
  /** Scored above the threshold but displaced by the category cap. */
  heldBack: ScoredCandidate[]
  /** How many of the requested slots the catalogue could not fill. */
  unfilled: number
}

export function rankCandidates(
  scored: ScoredCandidate[],
  options: RankOptions = {},
): RankResult {
  const max = options.max ?? DEFAULT_MAX_RECOMMENDATIONS
  const minScore = options.minScore ?? MIN_SCORE
  const maxPerCategory =
    options.maxPerCategory === undefined ? 1 : options.maxPerCategory

  const eligible = [...scored]
    .filter((candidate) => candidate.score >= minScore)
    .sort(compareCandidates)

  const selected: ScoredCandidate[] = []
  const heldBack: ScoredCandidate[] = []
  const perCategory = new Map<string, number>()

  for (const candidate of eligible) {
    if (selected.length >= max) {
      heldBack.push(candidate)
      continue
    }

    if (maxPerCategory !== null) {
      // Products with no routine category are not pooled together under a
      // shared "uncategorised" bucket — that would let one unplaced product
      // block every other unplaced product, which is a data gap being enforced
      // as if it were a decision.
      const key = candidate.product.routineCategory
      if (key) {
        const taken = perCategory.get(key) ?? 0
        if (taken >= maxPerCategory) {
          heldBack.push(candidate)
          continue
        }
        perCategory.set(key, taken + 1)
      }
    }

    selected.push(candidate)
  }

  return {
    selected,
    heldBack,
    unfilled: Math.max(0, max - selected.length),
  }
}

/**
 * Fills remaining slots from products the category cap displaced.
 *
 * Used only when the shortlist came up short. Relaxing Aurora's own diversity
 * preference is strictly better than handing the gap to a model: a second
 * serum the engine scored and can explain beats a product chosen by something
 * that never saw the scoring at all.
 */
export function backfillFromHeldBack(result: RankResult): RankResult {
  if (result.unfilled === 0 || result.heldBack.length === 0) return result

  const taken = result.heldBack.slice(0, result.unfilled)
  const selected = [...result.selected, ...taken].sort(compareCandidates)

  return {
    selected,
    heldBack: result.heldBack.slice(taken.length),
    unfilled: result.unfilled - taken.length,
  }
}
