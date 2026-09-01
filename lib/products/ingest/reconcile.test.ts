import assert from "node:assert/strict"
import { test } from "node:test"

import {
  matchExisting,
  planSync,
  reconcileProduct,
  type ExistingProduct,
} from "@/lib/products/ingest/reconcile"
import {
  intelligenceNeedsRefresh,
  sourceHash,
} from "@/lib/products/ingest/source-hash"
import {
  toAvailability,
  toPriceCents,
} from "@/lib/products/ingest/map-woocommerce"
import type { IngestProductInput } from "@/lib/products/ingest/types"

function input(over: Partial<IngestProductInput> = {}): IngestProductInput {
  return {
    source: "woocommerce",
    externalId: "1234",
    sku: "SKU-1",
    name: "Neem Cleanser",
    slug: "neem-cleanser",
    description: "A gentle daily cleanser.",
    category: "face-hands",
    ingredientList: [],
    targetConcerns: [],
    climateTags: [],
    published: true,
    ...over,
  }
}

function existing(over: Partial<ExistingProduct> & { id: string }): ExistingProduct {
  return {
    source: "woocommerce",
    externalId: null,
    slug: "neem-cleanser",
    sku: "SKU-1",
    sourceHash: null,
    verified: false,
    extracted: false,
    ...over,
  }
}

// ── Identity ────────────────────────────────────────────────────────────────

test("a renamed product updates its row instead of creating a second", () => {
  // The bug this replaces: matching was by slug, a slug is derived from the
  // name, so renaming in WooCommerce produced a duplicate Aurora row while the
  // original stayed behind still looking recommendable.
  const rows = [existing({ id: "p1", externalId: "1234", slug: "old-name" })]

  const action = reconcileProduct(input({ slug: "brand-new-name" }), rows)

  assert.equal(action.kind, "update")
  assert.equal(action.kind === "update" && action.id, "p1")
})

test("external id is preferred over a slug that belongs to another product", () => {
  const rows = [
    existing({ id: "right", externalId: "1234", slug: "something-else" }),
    existing({ id: "wrong", externalId: "9999", slug: "neem-cleanser" }),
  ]

  assert.equal(matchExisting(input(), rows)?.id, "right")
})

test("a seeded product with no external id is adopted by slug, not duplicated", () => {
  // The twenty-four fallback-seeded products carry no store id. The first real
  // sync must attach them to their originals rather than duplicate the shelf.
  const rows = [existing({ id: "seeded", source: "fallback", externalId: null })]

  const action = reconcileProduct(input(), rows)

  assert.equal(action.kind, "update")
  assert.equal(action.kind === "update" && action.id, "seeded")
})

test("adoption never steals a product already bound to another store id", () => {
  const rows = [existing({ id: "bound", externalId: "5555", slug: "neem-cleanser" })]

  const action = reconcileProduct(input({ externalId: "1234" }), rows)

  assert.equal(action.kind, "create")
})

test("an unmatched product is created", () => {
  assert.equal(reconcileProduct(input(), []).kind, "create")
})

// ── Verified intelligence ───────────────────────────────────────────────────

test("a sync never overwrites intelligence a person confirmed", () => {
  // The other bug this replaces: the sync rewrote concerns and climate tags
  // from its own inference on every run, so an administrator's correction
  // survived only until the next sync.
  const rows = [existing({ id: "p1", externalId: "1234", verified: true })]

  const action = reconcileProduct(input({ description: "Changed." }), rows)

  assert.equal(action.kind, "update")
  assert.equal(action.kind === "update" && action.mayWriteDerived, false)
})

test("a sync never overwrites what the extraction pass produced", () => {
  // Found by running a sync and watching the number move: the mapper infers
  // concerns from tag names, the extraction pass infers them from the full
  // product prose, and letting the first overwrite the second cost the
  // catalogue five points of average completeness in one run.
  const rows = [existing({ id: "p1", externalId: "1234", extracted: true })]

  const action = reconcileProduct(input({ description: "Changed." }), rows)

  assert.equal(action.kind === "update" && action.mayWriteDerived, false)
})

test("a product nothing has assessed yet takes the sync's hints", () => {
  const rows = [
    existing({ id: "p1", externalId: "1234", verified: false, extracted: false }),
  ]

  const action = reconcileProduct(input({ description: "Changed." }), rows)

  assert.equal(action.kind === "update" && action.mayWriteDerived, true)
})

// ── Change detection ────────────────────────────────────────────────────────

test("a price change does not invalidate extracted intelligence", () => {
  // Re-extracting because a product went on sale spends a model call to
  // rewrite the same answer, once per product per sync on a large catalogue.
  const before = input()
  const after = input({ priceCents: 9999, availability: "low_stock" })

  assert.equal(sourceHash(before), sourceHash(after))
})

test("a description change does invalidate it", () => {
  const before = input()
  const after = input({ description: "Now with added neem." })

  assert.notEqual(sourceHash(before), sourceHash(after))
  assert.equal(intelligenceNeedsRefresh(sourceHash(before), after), true)
})

test("reflowed whitespace is not a change of meaning", () => {
  // WooCommerce re-serialises HTML on unrelated saves.
  const before = input({ description: "A gentle   daily\n\ncleanser." })
  const after = input({ description: "A gentle daily cleanser." })

  assert.equal(sourceHash(before), sourceHash(after))
})

test("moving text between fields is a change", () => {
  const before = input({ name: "Neem", description: "Cleanser" })
  const after = input({ name: "Neem Cleanser", description: "" })

  assert.notEqual(sourceHash(before), sourceHash(after))
})

test("a product with no recorded hash counts as needing extraction", () => {
  // Every product predating this column. Nothing recorded what their
  // intelligence was derived from, so nothing can establish it still holds.
  assert.equal(intelligenceNeedsRefresh(null, input()), true)
})

test("an unchanged product is reported unchanged, not updated", () => {
  const rows = [
    existing({ id: "p1", externalId: "1234", sourceHash: sourceHash(input()) }),
  ]

  assert.equal(reconcileProduct(input(), rows).kind, "unchanged")
})

// ── Archiving ───────────────────────────────────────────────────────────────

test("a product the store no longer lists is reported for archiving", () => {
  const rows = [
    existing({ id: "gone", externalId: "1111" }),
    existing({ id: "kept", externalId: "1234" }),
  ]

  const plan = planSync([input({ externalId: "1234" })], rows)

  assert.deepEqual(plan.missingIds, ["gone"])
})

test("a store sync never archives manually entered products", () => {
  // A store outage must not empty a catalogue nobody asked it about.
  const rows = [
    existing({ id: "manual", source: "manual", externalId: null, slug: "typed-in" }),
    existing({ id: "seeded", source: "fallback", externalId: null, slug: "seeded" }),
  ]

  const plan = planSync([input({ externalId: "1234" })], rows)

  assert.deepEqual(plan.missingIds, [])
})

test("an empty source list archives nothing", () => {
  // A sync that returned nothing is far more likely to be a broken connection
  // than a store that deleted its entire catalogue.
  const rows = [existing({ id: "p1", externalId: "1234" })]

  assert.deepEqual(planSync([], rows).missingIds, [])
})

// ── Source field mapping ────────────────────────────────────────────────────

test("an absent price is null, never zero", () => {
  // Zero is a price — free — and claiming one the store never stated would be
  // a fabricated commercial fact.
  assert.equal(toPriceCents(undefined), null)
  assert.equal(toPriceCents(""), null)
  assert.equal(toPriceCents("not a number"), null)
  assert.equal(toPriceCents("24.50"), 2450)
  assert.equal(toPriceCents("0"), 0)
})

test("unknown stock status never maps upward to in stock", () => {
  assert.equal(toAvailability("instock"), "in_stock")
  assert.equal(toAvailability("outofstock"), "out_of_stock")
  assert.equal(toAvailability("onbackorder"), "low_stock")
  assert.equal(toAvailability(undefined), "unknown")
  assert.equal(toAvailability("something-new"), "unknown")
})
