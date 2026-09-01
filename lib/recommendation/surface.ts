import type { RoutineCategory } from "@/generated/prisma/client"
import {
  concernStrengths,
  type ConcernSource,
  type WeightedConcern,
} from "@/lib/recommendation/concerns"

/**
 * Which part of the body a product treats, and which concerns may justify it.
 *
 * Added after the engine, running against the real catalogue, put a hair oil
 * into a facial routine. It scored well and the arithmetic was correct: the oil
 * declares `dryness`, the face scan found dryness, they matched. The mistake
 * was upstream of the score — "dryness" observed on a face is not evidence
 * about a scalp, and nothing in the pipeline knew the difference.
 *
 * A scan is a photograph of a face. That is the only surface it can support a
 * finding about, so scan-derived concerns justify face products and nothing
 * else. A hair or body product has to be justified by something the person
 * actually said.
 */

export type ProductSurface = "face" | "hair" | "body"

const SURFACE_BY_CATEGORY: Partial<Record<RoutineCategory, ProductSurface>> = {
  haircare: "hair",
  bodycare: "body",
}

/**
 * Unplaced products are treated as face products.
 *
 * The permissive default is deliberate: an unclassified product is a gap in
 * the data, and excluding it from every routine would silently shrink the
 * catalogue rather than surface the gap. Face is also where the evidence is,
 * so it is the reading most likely to be checked and corrected.
 */
export function productSurface(
  routineCategory: RoutineCategory | null,
): ProductSurface {
  if (!routineCategory) return "face"
  return SURFACE_BY_CATEGORY[routineCategory] ?? "face"
}

/** Concerns that are about hair or scalp, wherever they are declared. */
const HAIR_CONCERNS = new Set(["hair_fall", "dandruff", "scalp_comfort"])

/**
 * Whether a concern from a given source may justify a product on this surface.
 *
 * Two rules, in both directions:
 *
 * A face scan cannot speak for hair or body. `dryness` seen in a photograph is
 * a fact about the face in the photograph, so it justifies a face product and
 * not a scalp oil. A stated concern can speak for any surface, because the
 * person said it about themselves rather than about the photo.
 *
 * And a hair concern never justifies a face product, whatever its source. A
 * cleanser declaring `dandruff` is a tagging error, and honouring it would put
 * a face wash forward as an answer to a scalp complaint.
 */
export function concernJustifiesSurface(
  concern: string,
  source: ConcernSource,
  surface: ProductSurface,
): boolean {
  const isHairConcern = HAIR_CONCERNS.has(concern.trim().toLowerCase())

  if (surface === "face") return !isHairConcern
  if (source === "scan") return false

  // Hair and body products, justified by something the person stated.
  if (surface === "hair") return true
  return !isHairConcern
}

/**
 * The concerns that may justify a product on this surface, with their strengths.
 *
 * A surface-restricted view of the same weighted concerns, so a hair product
 * and a face product are scored against different — and correct — subsets of
 * what this person asserts. There are only three surfaces, so callers memoise
 * rather than recomputing per product.
 */
export function concernStrengthsForSurface(
  concerns: WeightedConcern[],
  surface: ProductSurface,
): Map<string, number> {
  return concernStrengths(
    concerns.filter((entry) =>
      concernJustifiesSurface(entry.concern, entry.source, surface),
    ),
  )
}
