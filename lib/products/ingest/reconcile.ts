import type { ProductSource } from "@/generated/prisma/client"

import { intelligenceNeedsRefresh, sourceHash } from "@/lib/products/ingest/source-hash"
import type { IngestProductInput } from "@/lib/products/ingest/types"

/**
 * What a sync should do to one product, decided without touching a database.
 *
 * Pure, because these are the rules most worth testing and least worth
 * discovering in production. Two of them exist because the previous sync got
 * them wrong:
 *
 * It matched on slug. A slug is derived from the product name, so renaming a
 * product in WooCommerce changed its slug, the next sync found no match, and
 * created a second Aurora row for the same store product — leaving the original
 * behind as a duplicate that still looked recommendable.
 *
 * It overwrote everything. The sync wrote concerns, skin types and climate tags
 * from its own inference on every run, so any correction an administrator made
 * survived only until the next sync.
 */

/** An existing Aurora product, reduced to what reconciliation needs. */
export type ExistingProduct = {
  id: string
  source: ProductSource
  externalId: string | null
  slug: string
  sku: string
  sourceHash: string | null
  /** Whether a person has confirmed this product's intelligence. */
  verified: boolean
  /**
   * Whether the extraction pass has already produced intelligence for this
   * product.
   *
   * Separate from `verified`, and for a reason found by running a sync: the
   * store mapper infers concerns and climate tags from tag names, the
   * extraction pass infers them from the full product prose, and the second is
   * strictly better informed. Treating "not yet confirmed by a person" as
   * licence to overwrite let a crude inference replace a careful one and cost
   * the catalogue five points of completeness in a single run.
   */
  extracted: boolean
}

export type ReconcileAction =
  | { kind: "create"; input: IngestProductInput; hash: string }
  | {
      kind: "update"
      id: string
      input: IngestProductInput
      hash: string
      /** Source text changed, so previously derived intelligence may not hold. */
      markStale: boolean
      /** Whether derived fields may be written from this sync's inference. */
      mayWriteDerived: boolean
    }
  // Carries the input even though nothing about the source changed: the
  // caller still recomputes derived columns from it, and re-deriving which
  // source product a row came from would mean running this matching twice.
  | { kind: "unchanged"; id: string; input: IngestProductInput }

/**
 * Finds the Aurora row a source product corresponds to.
 *
 * External id first and by preference: it is the only identifier the source
 * system guarantees stable across renames. Slug is a fallback used exactly
 * once — to adopt a row that predates provenance tracking, so the twenty-four
 * seeded products attach to their store originals on the first real sync
 * instead of being duplicated.
 */
export function matchExisting(
  input: IngestProductInput,
  existing: ExistingProduct[],
): ExistingProduct | null {
  if (input.externalId) {
    const byExternal = existing.find(
      (row) => row.source === input.source && row.externalId === input.externalId,
    )
    if (byExternal) return byExternal
  }

  // Adoption path. Restricted to rows that carry no external id of their own,
  // so this can never steal a product already bound to a different store id.
  const bySlug = existing.find(
    (row) => row.slug === input.slug && row.externalId === null,
  )

  return bySlug ?? null
}

export function reconcileProduct(
  input: IngestProductInput,
  existing: ExistingProduct[],
): ReconcileAction {
  const hash = sourceHash(input)
  const match = matchExisting(input, existing)

  if (!match) {
    return { kind: "create", input, hash }
  }

  const markStale = intelligenceNeedsRefresh(match.sourceHash, input)

  // A product nobody has changed still needs no write. Reported separately from
  // `updated` so a sync that genuinely changed nothing says so, rather than
  // claiming it updated the whole catalogue.
  if (!markStale && match.sourceHash === hash) {
    return { kind: "unchanged", id: match.id, input }
  }

  return {
    kind: "update",
    id: match.id,
    input,
    hash,
    markStale,
    // The sync's hints seed a product nothing has assessed yet. Once anything
    // better exists — an extraction, or a person's confirmation — the store may
    // keep updating the product's name, price, image and stock, but not what
    // Aurora believes the product is for.
    mayWriteDerived: !match.verified && !match.extracted,
  }
}

export type ReconcilePlan = {
  actions: ReconcileAction[]
  /** Aurora products the source no longer lists, by id. */
  missingIds: string[]
}

/**
 * The whole plan for one sync.
 *
 * Products absent from the source are reported for archiving, never deletion.
 * A recommendation made last month names a product by slug and must keep
 * resolving, so a product leaving the store ends its availability rather than
 * its existence.
 */
export function planSync(
  inputs: IngestProductInput[],
  existing: ExistingProduct[],
): ReconcilePlan {
  const actions: ReconcileAction[] = []
  const seen = new Set<string>()

  for (const input of inputs) {
    const action = reconcileProduct(input, existing)
    if (action.kind !== "create") seen.add(action.id)
    actions.push(action)
  }

  // Only products from the same source are candidates for archiving. A sync of
  // the WooCommerce catalogue says nothing about a clinic's own products or one
  // an administrator entered by hand, and archiving those would let a store
  // outage empty a catalogue nobody asked it about.
  const syncedSource = inputs[0]?.source
  const missingIds = syncedSource
    ? existing
        .filter((row) => row.source === syncedSource && !seen.has(row.id))
        .map((row) => row.id)
    : []

  return { actions, missingIds }
}
