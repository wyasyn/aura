import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import {
  allClassifications,
  isProductClassification,
  splitClassifications,
} from "@/lib/products/classification"
import {
  CONFIDENT_RECOMMENDATION_THRESHOLD,
  assessCompleteness,
  completenessScore,
  isConfidentlyRecommendable,
} from "@/lib/products/completeness"
import { ROUTINE_STEP_BY_CATEGORY } from "@/lib/products/constants"

/**
 * The product intelligence layer.
 *
 * All pure, so the rules are exercised directly rather than through a database.
 * What matters here is that the derived values are actually derived — a
 * completeness score that ignores a field, or a routine step typed in by hand,
 * would look correct in the UI and be wrong in the engine that reads it later.
 */

describe("classification splits and recombines", () => {
  it("the primary comes first and is not repeated", () => {
    const record = splitClassifications(["organic", "natural", "ayurvedic"], "natural")
    assert.equal(record.primaryClassification, "natural")
    assert.deepEqual(record.secondaryClassifications, ["organic", "ayurvedic"])
    assert.deepEqual(allClassifications(record), ["natural", "organic", "ayurvedic"])
  })

  it("falls back to the first value when no primary is nominated", () => {
    const record = splitClassifications(["clinical", "dermatological"])
    assert.equal(record.primaryClassification, "clinical")
    assert.deepEqual(record.secondaryClassifications, ["dermatological"])
  })

  // A primary that is not among the selected values would leave the product
  // claiming something the form never offered.
  it("ignores a primary that was not selected", () => {
    const record = splitClassifications(["organic"], "clinical")
    assert.equal(record.primaryClassification, "organic")
  })

  it("deduplicates", () => {
    const record = splitClassifications(["organic", "organic", "natural"])
    assert.deepEqual(allClassifications(record), ["organic", "natural"])
  })

  // Empty means unassessed. `other` means assessed and fitting nothing. The
  // whole point of nullable primary is keeping those apart.
  it("empty stays distinct from other", () => {
    const none = splitClassifications([])
    assert.equal(none.primaryClassification, null)
    assert.deepEqual(allClassifications(none), [])

    const other = splitClassifications(["other"])
    assert.deepEqual(allClassifications(other), ["other"])
  })

  it("recognises only real classification values", () => {
    assert.equal(isProductClassification("ayurvedic"), true)
    assert.equal(isProductClassification("vegan"), false)
    assert.equal(isProductClassification(""), false)
  })
})

describe("completeness counts what is known, not what is good", () => {
  const bare = { name: "A product", description: "Does something." }

  it("an empty product scores near zero", () => {
    assert.ok(completenessScore({}) === 0)
  })

  it("a name and description alone score low", () => {
    assert.ok(completenessScore(bare) < 15)
  })

  // The two fields a match is actually made on carry the most weight.
  it("concerns and skin types move the score most", () => {
    const withConcerns = completenessScore({ ...bare, targetConcerns: ["dryness"] })
    const withImage = completenessScore({ ...bare, imageUrl: "https://x/y.png" })
    assert.ok(
      withConcerns > withImage,
      "target concerns must outweigh an image",
    )
  })

  it("either ingredient form counts", () => {
    const viaList = completenessScore({ ...bare, ingredientList: ["AQUA"] })
    const viaText = completenessScore({ ...bare, ingredients: "Aqua, Glycerin" })
    assert.equal(viaList, viaText)
  })

  it("a fully populated product scores 100", () => {
    const full = {
      name: "Full",
      description: "Complete.",
      brand: "Aurora",
      imageUrl: "https://x/y.png",
      primaryClassification: "natural",
      targetConcerns: ["dryness"],
      suitableSkinTypes: ["dry"],
      cosmeticBenefits: ["hydration"],
      climateTags: ["dry"],
      ingredientList: ["AQUA"],
      routineCategory: "serum",
      priceCents: 1999,
    }
    assert.equal(completenessScore(full), 100)
    assert.deepEqual(assessCompleteness(full).missing, [])
  })

  // The report is what makes the score actionable rather than a number.
  it("names what is missing, worst first", () => {
    const report = assessCompleteness(bare)
    assert.ok(report.missing.length > 0)
    assert.equal(report.missing[0], "Target concerns")
    assert.ok(report.missing.includes("Suitable skin types"))
  })

  it("whitespace does not count as filled", () => {
    assert.equal(completenessScore({ name: "   ", description: "  " }), 0)
  })

  it("an empty array does not count as populated", () => {
    assert.equal(completenessScore({ ...bare, targetConcerns: [] }), completenessScore(bare))
  })

  it("a zero price does not count as priced", () => {
    assert.equal(completenessScore({ ...bare, priceCents: 0 }), completenessScore(bare))
  })

  it("the confidence threshold is applied consistently", () => {
    const good = {
      name: "x", description: "y", targetConcerns: ["dryness"],
      suitableSkinTypes: ["dry"], ingredients: "Aqua",
      primaryClassification: "natural", cosmeticBenefits: ["hydration"],
    }
    assert.equal(
      isConfidentlyRecommendable(good),
      completenessScore(good) >= CONFIDENT_RECOMMENDATION_THRESHOLD,
    )
  })
})

describe("routine ordering is derived, never typed", () => {
  it("steps ascend through a real routine", () => {
    const order = ROUTINE_STEP_BY_CATEGORY
    assert.ok(order.cleanser < order.toner)
    assert.ok(order.toner < order.serum)
    assert.ok(order.serum < order.moisturiser)
    assert.ok(order.moisturiser < order.sunscreen)
  })

  it("leaves gaps so a category can be inserted later", () => {
    const values = Object.values(ROUTINE_STEP_BY_CATEGORY)
    const gaps = values.slice(1).map((v, i) => v - values[i])
    assert.ok(gaps.every((gap) => gap >= 5), "consecutive steps would force a renumber")
  })

  // Typed in by hand, two products in the same category would order differently.
  it("the step is looked up from the category, not accepted from a form", () => {
    const src = readFileSync("lib/products/intelligence-fields.ts", "utf8")
    assert.match(src, /routineStep: routineCategory \? ROUTINE_STEP_BY_CATEGORY\[routineCategory\] : null/)
    const schema = readFileSync("lib/products/schemas.ts", "utf8")
    assert.doesNotMatch(schema, /routineStep/)
  })
})

describe("the persisted intelligence fields are derived in one place", () => {
  const src = readFileSync("lib/products/intelligence-fields.ts", "utf8")
  const actions = readFileSync("lib/clinics/product-actions.ts", "utf8")

  it("both create and update go through it", () => {
    const uses = actions.match(/productIntelligenceFields\(form\)/g) ?? []
    assert.equal(uses.length, 2, "create and update must share the derivation")
  })

  // A stale score is worse than none: it looks authoritative.
  it("the completeness score is recomputed on every write", () => {
    assert.match(src, /completenessScore: completenessScore\(/)
  })

  it("saving a form never claims a classification was confirmed", () => {
    assert.doesNotMatch(src, /classificationConfidence: \("confirmed"/)
    assert.match(src, /"imported" as const/)
  })
})
