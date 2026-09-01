import { productSurface, type ProductSurface } from "@/lib/recommendation/surface"
import type { ScoredCandidate } from "@/lib/recommendation/types"

/**
 * Arranges a shortlist into a routine somebody can actually follow.
 *
 * Ordering comes from Product.routineStep, which is derived from the category
 * rather than typed in, so two products in the same category always sort
 * together no matter who entered them. A product with no step is unplaced, not
 * first — the distinction matters, because defaulting an unknown to the front
 * would put an unassessed product before the cleanser.
 */

export type RoutineSlot = "am" | "pm"

export type RoutineEntry = {
  slug: string
  name: string
  routineCategory: string | null
  routineStep: number | null
  surface: ProductSurface
  /** Concerns this product answers, strongest first. */
  addresses: string[]
}

export type Routine = {
  /** The facial routine, in application order. */
  am: RoutineEntry[]
  pm: RoutineEntry[]
  /**
   * Hair and body products, which are not steps in a facial routine.
   *
   * Separated because routineStep orders a face routine — cleanser, toner,
   * serum, moisturiser, sunscreen — and a hair oil has no position in that
   * sequence. Sorting it in by step put it at the end and read as "and finally,
   * apply the hair oil to your face", which is not what the engine selected it
   * for. It is a real recommendation, so it is shown; it is just not a step.
   */
  additional: RoutineEntry[]
  /**
   * Products that belong in neither slot.
   *
   * A product flagged neither amSuitable nor pmSuitable is a data error rather
   * than a product with no time of day, so it is surfaced instead of dropped —
   * silently discarding it would hide the error and shrink the advice.
   */
  unplaced: RoutineEntry[]
}

function toEntry(candidate: ScoredCandidate): RoutineEntry {
  return {
    slug: candidate.product.slug,
    name: candidate.product.name,
    routineCategory: candidate.product.routineCategory,
    routineStep: candidate.product.routineStep,
    surface: productSurface(candidate.product.routineCategory),
    addresses: candidate.citableConcerns,
  }
}

/**
 * Sorts a slot into application order.
 *
 * Unplaced products sort last within their slot rather than being dropped: the
 * step is missing, which is a gap in the data, not a statement that the product
 * comes last. Putting it at the end keeps the ordered part correct while still
 * showing the product.
 */
function byStep(a: RoutineEntry, b: RoutineEntry): number {
  if (a.routineStep === null && b.routineStep === null) {
    return a.slug.localeCompare(b.slug)
  }
  if (a.routineStep === null) return 1
  if (b.routineStep === null) return -1
  if (a.routineStep !== b.routineStep) return a.routineStep - b.routineStep

  return a.slug.localeCompare(b.slug)
}

export function buildRoutine(selected: ScoredCandidate[]): Routine {
  const am: RoutineEntry[] = []
  const pm: RoutineEntry[] = []
  const additional: RoutineEntry[] = []
  const unplaced: RoutineEntry[] = []

  for (const candidate of selected) {
    const entry = toEntry(candidate)
    const { amSuitable, pmSuitable } = candidate.product

    if (!amSuitable && !pmSuitable) {
      unplaced.push(entry)
      continue
    }

    if (entry.surface !== "face") {
      additional.push(entry)
      continue
    }

    // A product suitable for both appears in both. It is one product used
    // twice a day, and showing it once would leave one of the two routines
    // missing a step the person is meant to follow.
    if (amSuitable) am.push(entry)
    if (pmSuitable) pm.push(entry)
  }

  return {
    am: am.sort(byStep),
    pm: pm.sort(byStep),
    additional: additional.sort(byStep),
    unplaced: unplaced.sort(byStep),
  }
}
