import assert from "node:assert/strict"
import { test } from "node:test"

import {
  applyModelReasons,
  concernPhrase,
  deterministicReason,
  listPhrase,
} from "@/lib/recommendation/explain"
import { selectSuppliedReasons } from "@/lib/recommendation/explain-gemini"
import type { CandidateProduct, ScoredCandidate } from "@/lib/recommendation/types"

function candidate(
  slug: string,
  citableConcerns: string[] = [],
  citableIngredients: string[] = [],
): ScoredCandidate {
  const product = { slug, name: slug } as CandidateProduct
  return {
    product,
    score: 10,
    rawScore: 10,
    multiplier: 1,
    components: [],
    citableConcerns,
    citableIngredients,
  }
}

test("clinical terms never reach the reason", () => {
  // The system prompt forbids naming clinical conditions. A reason assembled
  // from raw slugs would break that in the one place nobody reviews.
  assert.equal(concernPhrase("hyperpigmentation"), "uneven tone")
  assert.equal(concernPhrase("acne"), "blemish-prone areas")
  assert.equal(concernPhrase("oiliness"), "congestion and shine")
})

test("an unmapped concern is opened up rather than dropped", () => {
  // Dropping it would hide the gap in the table and make the reason vaguer.
  assert.equal(concernPhrase("barrier_support"), "barrier support")
  assert.equal(concernPhrase("some_new_concern"), "some new concern")
})

test("lists read the way a person writes them", () => {
  assert.equal(listPhrase(["a"]), "a")
  assert.equal(listPhrase(["a", "b"]), "a and b")
  assert.equal(listPhrase(["a", "b", "c"]), "a, b and c")
  assert.equal(listPhrase([]), "")
})

test("a reason states the findings and the actives that justify them", () => {
  const reason = deterministicReason(
    candidate("p", ["hyperpigmentation", "aging"], ["Turmeric", "Glutathione"]),
  )

  assert.equal(
    reason,
    "Selected for uneven tone and fine lines, with Turmeric and Glutathione.",
  )
})

test("a reason without actives still names the finding", () => {
  assert.equal(
    deterministicReason(candidate("p", ["dryness"])),
    "Selected for dryness.",
  )
})

test("a reason never runs past two findings", () => {
  const reason = deterministicReason(
    candidate("p", ["dryness", "aging", "redness", "texture"]),
  )

  assert.equal(reason, "Selected for dryness and fine lines.")
})

test("a product selected on nothing says so rather than inventing a reason", () => {
  const reason = deterministicReason(candidate("p"))
  assert.match(reason, /general step/)
})

test("model prose replaces the deterministic sentence when present", () => {
  const candidates = [candidate("a", ["dryness"]), candidate("b", ["aging"])]
  const reasons = applyModelReasons(
    candidates,
    new Map([["a", "Your skin reads dry, and this is built to hold water in it."]]),
  )

  assert.equal(reasons.get("a"), "Your skin reads dry, and this is built to hold water in it.")
  // b keeps its deterministic reason. A partial response degrades one reason,
  // never all of them.
  assert.equal(reasons.get("b"), "Selected for fine lines.")
})

test("an empty model reason falls back rather than shipping blank", () => {
  const candidates = [candidate("a", ["dryness"])]
  const reasons = applyModelReasons(candidates, new Map([["a", "   "]]))

  assert.equal(reasons.get("a"), "Selected for dryness.")
})

test("every selected product gets a reason, whatever the model returned", () => {
  const candidates = [candidate("a", ["dryness"]), candidate("b", ["aging"])]
  const reasons = applyModelReasons(candidates, new Map())

  assert.equal(reasons.size, 2)
  assert.ok(reasons.get("a"))
  assert.ok(reasons.get("b"))
})

test("the model cannot add a product by naming one it was not given", () => {
  // The prompt never shows it the catalogue, but "no route" is an argument
  // about the prompt. This is the check that makes it a property of the code.
  const candidates = [candidate("chosen", ["dryness"])]
  const reasons = selectSuppliedReasons(
    [
      { slug: "chosen", reason: "A good fit." },
      { slug: "not-chosen", reason: "Also try this one." },
    ],
    candidates,
  )

  assert.deepEqual([...reasons.keys()], ["chosen"])
})

test("a duplicated slug keeps the first reason, not the last", () => {
  const reasons = selectSuppliedReasons(
    [
      { slug: "a", reason: "First." },
      { slug: "a", reason: "Second." },
    ],
    [candidate("a")],
  )

  assert.equal(reasons.get("a"), "First.")
})
