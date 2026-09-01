import assert from "node:assert/strict"
import { test } from "node:test"

import { keepKnown } from "@/lib/products/enrich/schema"
import { toEnrichmentUpdate } from "@/lib/products/enrich/normalize"
import { PRODUCT_SKIN_TYPE_OPTIONS } from "@/lib/products/constants"
import type { ProductExtraction } from "@/lib/products/enrich/schema"

function extraction(over: Partial<ProductExtraction> = {}): ProductExtraction {
  return {
    primaryClassification: "natural",
    secondaryClassifications: [],
    suitableSkinTypes: [],
    cosmeticBenefits: [],
    targetConcerns: [],
    climateTags: [],
    routineCategory: null,
    amSuitable: true,
    pmSuitable: true,
    suitableHumidity: [],
    suitableTemperature: [],
    suitableUv: [],
    brand: null,
    keyIngredients: [],
    ...over,
  }
}

const EMPTY: Parameters<typeof toEnrichmentUpdate>[1] = {
  brand: null,
  targetConcerns: [],
  primaryClassification: null,
}

test("keepKnown drops anything outside the vocabulary", () => {
  assert.deepEqual(
    keepKnown(["oily", "leathery", "dry"], PRODUCT_SKIN_TYPE_OPTIONS),
    ["oily", "dry"],
  )
})

test("keepKnown dedupes and is case-insensitive", () => {
  assert.deepEqual(keepKnown(["Oily", "oily", "OILY"], PRODUCT_SKIN_TYPE_OPTIONS), [
    "oily",
  ])
})

test("the primary classification is never repeated among the secondaries", () => {
  const update = toEnrichmentUpdate(
    extraction({
      primaryClassification: "organic",
      secondaryClassifications: ["organic", "natural"],
    }),
    EMPTY,
  )

  assert.equal(update.primaryClassification, "organic")
  assert.deepEqual(update.secondaryClassifications, ["natural"])
})

test("routine step is derived from the category, never supplied", () => {
  assert.equal(toEnrichmentUpdate(extraction({ routineCategory: "cleanser" }), EMPTY).routineStep, 10)
  assert.equal(toEnrichmentUpdate(extraction({ routineCategory: "serum" }), EMPTY).routineStep, 50)
  assert.equal(toEnrichmentUpdate(extraction({ routineCategory: null }), EMPTY).routineStep, null)
})

test("existing concerns survive enrichment", () => {
  // The import got these from the people who sell the product. A model reading
  // the same copy is not grounds to throw them away.
  const update = toEnrichmentUpdate(
    extraction({ targetConcerns: ["hydration"] }),
    { ...EMPTY, targetConcerns: ["dryness", "aging"] },
  )

  assert.deepEqual(update.targetConcerns, ["dryness", "aging", "hydration"])
})

test("an existing brand is never overwritten by an extracted one", () => {
  const update = toEnrichmentUpdate(
    extraction({ brand: "Guessed Brand" }),
    { ...EMPTY, brand: "Aurora Organics" },
  )

  assert.equal(update.brand, "Aurora Organics")
})

test("enrichment can never claim a human confirmed the data", () => {
  const update = toEnrichmentUpdate(extraction({ primaryClassification: "clinical" }), EMPTY)
  assert.equal(update.classificationConfidence, "imported")
})

test("confidence stays unverified when no classification was reached", () => {
  const update = toEnrichmentUpdate(extraction({ primaryClassification: null }), EMPTY)

  assert.equal(update.primaryClassification, null)
  assert.equal(update.classificationConfidence, "unverified")
})

test("invented vocabulary is dropped rather than taking the product down with it", () => {
  const update = toEnrichmentUpdate(
    extraction({
      cosmeticBenefits: ["hydration", "cures_eczema", "soothing"],
      suitableSkinTypes: ["dry", "porcelain"],
      climateTags: ["humid", "tropical"],
    }),
    EMPTY,
  )

  assert.deepEqual(update.cosmeticBenefits, ["hydration", "soothing"])
  assert.deepEqual(update.suitableSkinTypes, ["dry"])
  assert.deepEqual(update.climateTags, ["humid"])
})
