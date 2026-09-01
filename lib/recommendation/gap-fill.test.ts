import assert from "node:assert/strict"
import { test } from "node:test"

import { selectGapFills } from "@/lib/recommendation/gap-fill"
import type { ProductRecommendation } from "@/lib/scan/types"

function rec(id: string): ProductRecommendation {
  return { id, name: id, reason: "" }
}

/** Stands in for the database-backed allergy filter. */
const allowAll = async (items: ProductRecommendation[]) => items
const blockAll = async () => []

test("nothing is filled when the engine needed nothing", () => {
  const filled = selectGapFills({
    modelRecommendations: [rec("a"), rec("b")],
    alreadySelected: [],
    needed: 0,
    allergies: null,
  }, allowAll)

  return filled.then((result) => assert.deepEqual(result, []))
})

test("a gap fill never displaces what the engine chose", async () => {
  const filled = await selectGapFills({
    modelRecommendations: [rec("engine-pick"), rec("model-pick")],
    alreadySelected: [rec("engine-pick")],
    needed: 2,
    allergies: null,
  }, allowAll)

  assert.deepEqual(filled.map((r) => r.id), ["model-pick"])
})

test("a gap fill takes at most the slots the engine left open", async () => {
  const filled = await selectGapFills({
    modelRecommendations: [rec("a"), rec("b"), rec("c"), rec("d")],
    alreadySelected: [],
    needed: 2,
    allergies: null,
  }, allowAll)

  assert.equal(filled.length, 2)
})

test("nothing is filled when the model proposed nothing", async () => {
  const filled = await selectGapFills({
    modelRecommendations: [],
    alreadySelected: [],
    needed: 4,
    allergies: null,
  }, allowAll)

  assert.deepEqual(filled, [])
})

test("a gap fill is refused when every candidate is already taken", async () => {
  const filled = await selectGapFills({
    modelRecommendations: [rec("a")],
    alreadySelected: [rec("a")],
    needed: 2,
    allergies: null,
  }, allowAll)

  assert.deepEqual(filled, [])
})

test("a gap fill still passes the allergy filter", async () => {
  // The engine's own safety pass never saw these products. A filter that runs
  // on one of two paths is a filter that does not run.
  const filled = await selectGapFills(
    {
      modelRecommendations: [rec("has-allergen")],
      alreadySelected: [],
      needed: 2,
      allergies: "lavender",
    },
    blockAll,
  )

  assert.deepEqual(filled, [])
})

test("the allergy filter receives the stated allergies, not a default", async () => {
  let seen: string | null | undefined
  await selectGapFills(
    {
      modelRecommendations: [rec("a")],
      alreadySelected: [],
      needed: 1,
      allergies: "nuts, lavender",
    },
    async (items, allergies) => {
      seen = allergies
      return items
    },
  )

  assert.equal(seen, "nuts, lavender")
})
