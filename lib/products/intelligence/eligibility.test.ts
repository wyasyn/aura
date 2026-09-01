import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { CONFIDENT_RECOMMENDATION_THRESHOLD } from "@/lib/products/completeness"
import {
  evaluateEligibility,
  statusForOutcome,
  type EligibilityInput,
} from "@/lib/products/intelligence/eligibility"

const extractService = readFileSync(
  "lib/products/intelligence/extract-product.ts",
  "utf8",
)
const adminActions = readFileSync("lib/products/actions.ts", "utf8")
const cataloguePass = readFileSync("lib/products/enrich/run.ts", "utf8")

function eligible(over: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    isActive: true,
    intelligenceStatus: "extracted",
    intelligenceStale: false,
    completenessScore: 90,
    primaryClassification: "natural",
    targetConcerns: ["dryness"],
    ...over,
  }
}

describe("what an extraction leaves behind", () => {
  it("a complete extraction is extracted", () => {
    assert.equal(
      statusForOutcome({ classified: true, completenessScore: 90, missing: [] }),
      "extracted",
    )
  })

  it("an extraction that established too little needs review, not failure", () => {
    // It ran and honestly found little. The remedy is better source data, not
    // another pass over the same text.
    assert.equal(
      statusForOutcome({
        classified: true,
        completenessScore: CONFIDENT_RECOMMENDATION_THRESHOLD - 1,
        missing: ["Suitable skin types"],
      }),
      "needs_review",
    )
  })

  it("reaching no classification needs review however complete the rest", () => {
    assert.equal(
      statusForOutcome({ classified: false, completenessScore: 95, missing: [] }),
      "needs_review",
    )
  })
})

describe("recommendation eligibility", () => {
  it("a fully extracted, classified, concern-tagged product is eligible", () => {
    const result = evaluateEligibility(eligible())
    assert.equal(result.eligible, true)
    assert.deepEqual(result.reasons, [])
  })

  it("a product awaiting extraction is not eligible", () => {
    const result = evaluateEligibility(eligible({ intelligenceStatus: "pending" }))
    assert.equal(result.eligible, false)
    assert.match(result.reasons.join(" "), /Awaiting intelligence extraction/)
  })

  it("a failed extraction is not eligible", () => {
    const result = evaluateEligibility(eligible({ intelligenceStatus: "failed" }))
    assert.equal(result.eligible, false)
    assert.match(result.reasons.join(" "), /extraction failed/)
  })

  it("stale intelligence is not eligible", () => {
    // It was derived from text that has since changed, so nothing establishes
    // that it still holds.
    const result = evaluateEligibility(eligible({ intelligenceStale: true }))
    assert.equal(result.eligible, false)
  })

  it("a product with no concerns is reported, not silently never-recommended", () => {
    // The engine already drops products matching nothing the person asserts, so
    // this one could never be selected however complete it looked.
    const result = evaluateEligibility(eligible({ targetConcerns: [] }))
    assert.equal(result.eligible, false)
    assert.match(result.reasons.join(" "), /never match/)
  })

  it("below the engine's threshold is reported with the number", () => {
    const result = evaluateEligibility(eligible({ completenessScore: 30 }))
    assert.equal(result.eligible, false)
    assert.match(result.reasons.join(" "), /30%/)
  })

  it("an archived product is not eligible", () => {
    assert.equal(evaluateEligibility(eligible({ isActive: false })).eligible, false)
  })

  it("every reason is stated, not just the first", () => {
    const result = evaluateEligibility(
      eligible({
        intelligenceStatus: "pending",
        primaryClassification: null,
        targetConcerns: [],
        completenessScore: 0,
      }),
    )
    assert.ok(result.reasons.length >= 4, `expected several reasons, saw ${result.reasons.length}`)
  })
})

describe("both ingestion paths converge on one extraction service", () => {
  // The architecture's central claim. A second implementation for manual
  // products would let the two drift in what they produce.
  it("the catalogue pass drives the shared service rather than reimplementing it", () => {
    assert.match(cataloguePass, /extractProductIntelligence\(/)
    // No direct model call of its own.
    assert.doesNotMatch(cataloguePass, /extractProductAttributes\(/)
  })

  it("manual creation drives the same service", () => {
    assert.match(adminActions, /extractProductIntelligence\(product\.id\)/)
  })

  it("there is no separate manual or woocommerce extraction function", () => {
    for (const forbidden of [
      /manualProductExtraction/,
      /woocommerceProductExtraction/,
    ]) {
      assert.doesNotMatch(adminActions, forbidden)
      assert.doesNotMatch(cataloguePass, forbidden)
      assert.doesNotMatch(extractService, forbidden)
    }
  })
})

describe("extraction never takes the product with it", () => {
  it("the product is persisted before extraction runs", () => {
    const create = adminActions.match(
      /export async function createProductAction[\s\S]*?\n\}/,
    )
    assert.ok(create)
    assert.ok(
      create[0].indexOf("prisma.product.create") <
        create[0].indexOf("extractProductIntelligence"),
      "the product must be committed before the model call",
    )
  })

  it("a failed extraction records the reason and leaves the row alone", () => {
    assert.match(extractService, /intelligenceStatus: "failed"/)
    assert.match(extractService, /intelligenceError: message/)
  })

  it("a new product is never recommendable before anything has assessed it", () => {
    const create = adminActions.match(
      /export async function createProductAction[\s\S]*?\n\}/,
    )
    assert.ok(create)
    assert.match(create[0], /isRecommendable: false/)
  })
})

describe("extraction is idempotent", () => {
  it("an extraction already in flight is skipped rather than repeated", () => {
    // A refreshed page or a double-submitted form must not start a second
    // model call for the same product. Asserted as three separate conditions
    // rather than one literal line, because the guard also has to bound how
    // long a claim is believed — see the abandoned-claim test in
    // lib/products/jobs/queue.test.ts.
    assert.match(extractService, /intelligenceStatus === "extracting"/)
    assert.match(extractService, /!options\.force/)
    assert.match(extractService, /status: "skipped"/)
  })

  it("an explicit retry forces past that guard", () => {
    assert.match(adminActions, /extractProductIntelligence\(productId, \{ force: true \}\)/)
  })
})
