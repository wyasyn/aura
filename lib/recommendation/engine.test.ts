import assert from "node:assert/strict"
import { test } from "node:test"

import {
  concernStrengths,
  deriveConcerns,
  GOAL_CONCERN_STRENGTH,
  PROFILE_CONCERN_STRENGTH,
} from "@/lib/recommendation/concerns"
import {
  backfillFromHeldBack,
  compareCandidates,
  rankCandidates,
} from "@/lib/recommendation/rank"
import { buildRoutine } from "@/lib/recommendation/routine"
import { applySafetyFilters, requireConcernMatch } from "@/lib/recommendation/safety"
import { scoreProduct } from "@/lib/recommendation/scoring"
import { DEFAULT_WEIGHTS, resolveWeights } from "@/lib/recommendation/weights"
import type {
  CandidateIngredient,
  CandidateProduct,
  RecommendationContext,
  ScoredCandidate,
} from "@/lib/recommendation/types"

function product(over: Partial<CandidateProduct> & { slug: string }): CandidateProduct {
  return {
    name: over.slug,
    description: "",
    category: "face-hands",
    brand: null,
    primaryClassification: "natural",
    secondaryClassifications: [],
    classificationConfidence: "imported",
    targetConcerns: [],
    suitableSkinTypes: [],
    cosmeticBenefits: [],
    climateTags: [],
    suitableHumidity: [],
    suitableTemperature: [],
    suitableUv: [],
    routineCategory: null,
    routineStep: null,
    amSuitable: true,
    pmSuitable: true,
    availability: "in_stock",
    isActive: true,
    isRecommendable: true,
    completenessScore: 100,
    ingredients: null,
    ingredientList: [],
    ingredientLinks: [],
    imageUrl: null,
    storeUrl: null,
    source: "aurora",
    ...over,
  }
}

function ingredient(
  over: Partial<CandidateIngredient> & { inciName: string },
): CandidateIngredient {
  return {
    displayName: null,
    role: "active",
    isKeyActive: true,
    position: 1,
    targetConcerns: [],
    benefits: [],
    doshaAffinities: [],
    avoidWith: [],
    ...over,
  }
}

function context(over: Partial<RecommendationContext> = {}): RecommendationContext {
  const concerns = over.concerns ?? []
  return {
    skinType: null,
    dosha: null,
    goals: [],
    climateTags: [],
    humidityBand: null,
    temperatureBand: null,
    uvBand: null,
    allergies: null,
    ...over,
    concerns,
    concernStrengths: over.concernStrengths ?? concernStrengths(concerns),
  }
}

// ── Stage 4: context ────────────────────────────────────────────────────────

test("a scan dimension becomes the product concerns it implies", () => {
  const concerns = deriveConcerns({
    dimensions: [{ id: "pigmentation", band: "elevated" }],
  })

  assert.deepEqual(
    concerns.map((c) => c.concern),
    ["hyperpigmentation"],
  )
  assert.equal(concerns[0].source, "scan")
  assert.equal(concerns[0].strength, 1)
})

test("dimensions below moderate assert nothing", () => {
  // The prompt already refuses to recommend against a mild finding. The engine
  // holds the same line rather than quietly scoring it.
  const concerns = deriveConcerns({
    dimensions: [
      { id: "redness", band: "mild" },
      { id: "hydration", band: "minimal" },
      { id: "wrinkles", band: "not_assessed" },
    ],
  })

  assert.deepEqual(concerns, [])
})

test("photographed evidence outweighs self-report", () => {
  const scan = deriveConcerns({ dimensions: [{ id: "wrinkles", band: "moderate" }] })
  const stated = deriveConcerns({ primaryConcerns: ["aging"] })
  const goal = deriveConcerns({ skinGoals: ["aging"] })

  assert.ok(scan[0].strength > stated[0].strength)
  assert.ok(stated[0].strength > goal[0].strength)
  assert.equal(stated[0].strength, PROFILE_CONCERN_STRENGTH)
  assert.equal(goal[0].strength, GOAL_CONCERN_STRENGTH)
})

test("a stated concern the photo confirms accumulates", () => {
  const strengths = concernStrengths(
    deriveConcerns({
      dimensions: [{ id: "wrinkles", band: "moderate" }],
      primaryConcerns: ["aging"],
    }),
  )

  // 0.7 from the scan plus 0.5 from the profile. Agreement is more evidence,
  // not a duplicate to discard.
  assert.equal(strengths.get("aging"), 1.2)
})

test("an unknown dimension id is ignored rather than guessed at", () => {
  assert.deepEqual(deriveConcerns({ dimensions: [{ id: "glow", band: "elevated" }] }), [])
})

// ── Stage 5: safety ─────────────────────────────────────────────────────────

test("withdrawn and inactive products never reach scoring", () => {
  const { safe, excluded } = applySafetyFilters(
    [
      product({ slug: "inactive", isActive: false }),
      product({ slug: "withdrawn", isRecommendable: false }),
      product({ slug: "discontinued", availability: "discontinued" }),
      product({ slug: "fine" }),
    ],
    context(),
  )

  assert.deepEqual(safe.map((p) => p.slug), ["fine"])
  assert.deepEqual(
    excluded.map((e) => e.reason),
    ["inactive", "not_recommendable", "unavailable"],
  )
})

test("unknown stock is recommendable, because it is the default nobody set", () => {
  const { safe } = applySafetyFilters(
    [product({ slug: "unset", availability: "unknown" })],
    context(),
  )

  assert.deepEqual(safe.map((p) => p.slug), ["unset"])
})

test("an allergy conflict is excluded and the matching term recorded", () => {
  const { safe, excluded } = applySafetyFilters(
    [
      product({ slug: "has-lavender", ingredientList: ["Lavandula Angustifolia Oil"] }),
      product({ slug: "clean", ingredientList: ["Glycerin"] }),
    ],
    context({ allergies: "lavender, nuts" }),
  )

  assert.deepEqual(safe.map((p) => p.slug), ["clean"])
  assert.equal(excluded[0].reason, "allergy_conflict")
  assert.equal(excluded[0].detail, "lavender")
})

test("a product addressing nothing this person has is not a weak match, it is not a match", () => {
  const ctx = context({ concerns: deriveConcerns({ primaryConcerns: ["acne"] }) })
  const { safe, excluded } = requireConcernMatch(
    [
      product({ slug: "for-acne", targetConcerns: ["acne"] }),
      product({ slug: "for-hair", targetConcerns: ["hair_fall"] }),
    ],
    ctx,
  )

  assert.deepEqual(safe.map((p) => p.slug), ["for-acne"])
  assert.equal(excluded[0].reason, "no_concern_match")
})

test("with no concerns asserted, relevance cannot filter and does not pretend to", () => {
  const { safe, excluded } = requireConcernMatch(
    [product({ slug: "a" }), product({ slug: "b" })],
    context(),
  )

  assert.equal(safe.length, 2)
  assert.deepEqual(excluded, [])
})

// ── Stage 6: scoring ────────────────────────────────────────────────────────

const DRYNESS = context({
  concerns: deriveConcerns({ dimensions: [{ id: "hydration", band: "elevated" }] }),
  skinType: "dry",
})

test("a product matching the asserted concern outscores one that does not", () => {
  const match = scoreProduct(
    product({ slug: "hydrator", targetConcerns: ["dryness"] }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )
  const miss = scoreProduct(
    product({ slug: "cleanser", targetConcerns: ["oiliness"] }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )

  assert.ok(match.score > miss.score)
  assert.equal(miss.score, 0)
})

test("an empty skin-type list says unassessed, not unsuitable", () => {
  // Scoring it as a mismatch would penalise exactly the products the
  // enrichment pass was correctly cautious about.
  const unassessed = scoreProduct(
    product({ slug: "a", targetConcerns: ["dryness"], suitableSkinTypes: [] }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )
  const wrongType = scoreProduct(
    product({ slug: "b", targetConcerns: ["dryness"], suitableSkinTypes: ["oily"] }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )

  assert.equal(unassessed.score, wrongType.score)
})

test("a citable active corroborating the concern raises the score", () => {
  const withEvidence = scoreProduct(
    product({
      slug: "with",
      targetConcerns: ["dryness"],
      ingredientLinks: [
        ingredient({ inciName: "Hyaluronic Acid", targetConcerns: ["dryness"] }),
      ],
    }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )
  const without = scoreProduct(
    product({ slug: "without", targetConcerns: ["dryness"] }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )

  assert.ok(withEvidence.score > without.score)
  assert.deepEqual(withEvidence.citableIngredients, ["Hyaluronic Acid"])
})

test("a solvent is not evidence, however relevant its listed concerns", () => {
  const scored = scoreProduct(
    product({
      slug: "p",
      targetConcerns: ["dryness"],
      ingredientLinks: [
        ingredient({
          inciName: "Glycerin",
          role: "solvent",
          isKeyActive: false,
          targetConcerns: ["dryness"],
        }),
      ],
    }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )

  assert.deepEqual(scored.citableIngredients, [])
})

test("data quality scales a match rather than creating one", () => {
  // The point of the multiplier: a complete moisturiser must not become a
  // better answer to acne than a sparse cleanser.
  const irrelevantButComplete = scoreProduct(
    product({ slug: "complete", targetConcerns: ["oiliness"], completenessScore: 100 }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )
  const relevantButSparse = scoreProduct(
    product({ slug: "sparse", targetConcerns: ["dryness"], completenessScore: 0 }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )

  assert.equal(irrelevantButComplete.score, 0)
  assert.ok(relevantButSparse.score > 0)
})

test("completeness moves the score without deciding it", () => {
  const complete = scoreProduct(
    product({ slug: "a", targetConcerns: ["dryness"], completenessScore: 100 }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )
  const sparse = scoreProduct(
    product({ slug: "b", targetConcerns: ["dryness"], completenessScore: 0 }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )

  assert.ok(complete.score > sparse.score)
  assert.equal(complete.rawScore, sparse.rawScore)
  assert.equal(sparse.multiplier, DEFAULT_WEIGHTS.completenessFloor)
})

test("every axis is reported with its fit, so a score can be explained", () => {
  const scored = scoreProduct(
    product({ slug: "p", targetConcerns: ["dryness"], suitableSkinTypes: ["dry"] }),
    DRYNESS,
    DEFAULT_WEIGHTS,
  )

  const skin = scored.components.find((c) => c.axis === "skinTypeFit")
  assert.equal(skin?.fit, 1)
  assert.equal(skin?.weight, DEFAULT_WEIGHTS.skinTypeFit)
  assert.equal(skin?.points, DEFAULT_WEIGHTS.skinTypeFit)
  assert.deepEqual(skin?.matched, ["dry"])
})

test("scoring is deterministic", () => {
  const p = product({ slug: "p", targetConcerns: ["dryness"] })
  const first = scoreProduct(p, DRYNESS, DEFAULT_WEIGHTS)
  const second = scoreProduct(p, DRYNESS, DEFAULT_WEIGHTS)

  assert.deepEqual(first, second)
})

// ── Weights ─────────────────────────────────────────────────────────────────

test("a clinic that tuned one weight keeps the defaults for the rest", () => {
  const weights = resolveWeights({ concernMatch: 20 })

  assert.equal(weights.concernMatch, 20)
  assert.equal(weights.skinTypeFit, DEFAULT_WEIGHTS.skinTypeFit)
})

test("weights that would invert the engine are refused", () => {
  // A negative concern weight ranks the least relevant product first. Stored
  // weights are tenant-editable, so this cannot be left to good intentions.
  assert.deepEqual(resolveWeights({ concernMatch: -5 }), DEFAULT_WEIGHTS)
  assert.deepEqual(resolveWeights({ completenessFloor: 4 }), DEFAULT_WEIGHTS)
})

test("a corrupt weights row falls back rather than failing the scan", () => {
  assert.deepEqual(resolveWeights("not an object"), DEFAULT_WEIGHTS)
  assert.deepEqual(resolveWeights(null), DEFAULT_WEIGHTS)
})

// ── Stage 7: ranking ────────────────────────────────────────────────────────

function scored(
  over: Partial<ScoredCandidate> & { slug: string; score: number },
): ScoredCandidate {
  return {
    rawScore: over.score,
    multiplier: 1,
    components: [],
    citableConcerns: [],
    citableIngredients: [],
    ...over,
    score: over.score,
    product: over.product ?? product({ slug: over.slug }),
  }
}

test("ties break deterministically, never by catalogue order", () => {
  const a = scored({ slug: "zebra", score: 5 })
  const b = scored({ slug: "apple", score: 5 })

  assert.ok(compareCandidates(a, b) > 0)
  assert.deepEqual(
    rankCandidates([a, b]).selected.map((c) => c.product.slug),
    ["apple", "zebra"],
  )
})

test("a shortlist is not four cleansers", () => {
  const candidates = [
    scored({ slug: "c1", score: 9, product: product({ slug: "c1", routineCategory: "cleanser" }) }),
    scored({ slug: "c2", score: 8, product: product({ slug: "c2", routineCategory: "cleanser" }) }),
    scored({ slug: "s1", score: 7, product: product({ slug: "s1", routineCategory: "serum" }) }),
    scored({ slug: "m1", score: 6, product: product({ slug: "m1", routineCategory: "moisturiser" }) }),
  ]

  const result = rankCandidates(candidates)

  assert.deepEqual(result.selected.map((c) => c.product.slug), ["c1", "s1", "m1"])
  assert.deepEqual(result.heldBack.map((c) => c.product.slug), ["c2"])
  assert.equal(result.unfilled, 1)
})

test("uncategorised products do not block each other", () => {
  // Pooling them under one bucket would enforce a data gap as if it were a
  // decision about routine composition.
  const candidates = [
    scored({ slug: "a", score: 9 }),
    scored({ slug: "b", score: 8 }),
    scored({ slug: "c", score: 7 }),
  ]

  assert.equal(rankCandidates(candidates).selected.length, 3)
})

test("products scoring on almost nothing are left out", () => {
  const result = rankCandidates([
    scored({ slug: "good", score: 9 }),
    scored({ slug: "noise", score: 0.2 }),
  ])

  assert.deepEqual(result.selected.map((c) => c.product.slug), ["good"])
  assert.equal(result.unfilled, 3)
})

test("relaxing our own diversity rule beats leaving a slot for a model to fill", () => {
  const candidates = [
    scored({ slug: "s1", score: 9, product: product({ slug: "s1", routineCategory: "serum" }) }),
    scored({ slug: "s2", score: 8, product: product({ slug: "s2", routineCategory: "serum" }) }),
  ]

  const filled = backfillFromHeldBack(rankCandidates(candidates, { max: 2 }))

  assert.deepEqual(filled.selected.map((c) => c.product.slug), ["s1", "s2"])
  assert.equal(filled.unfilled, 0)
})

test("backfill cannot invent products that do not exist", () => {
  const result = backfillFromHeldBack(rankCandidates([scored({ slug: "only", score: 9 })]))

  assert.equal(result.selected.length, 1)
  assert.equal(result.unfilled, 3)
})

// ── Stage 8: routine ────────────────────────────────────────────────────────

test("a routine follows application order, not score order", () => {
  const routine = buildRoutine([
    scored({
      slug: "moisturiser",
      score: 9,
      product: product({ slug: "moisturiser", routineCategory: "moisturiser", routineStep: 70 }),
    }),
    scored({
      slug: "cleanser",
      score: 3,
      product: product({ slug: "cleanser", routineCategory: "cleanser", routineStep: 10 }),
    }),
  ])

  assert.deepEqual(routine.am.map((e) => e.slug), ["cleanser", "moisturiser"])
})

test("a product used twice a day appears in both routines", () => {
  const routine = buildRoutine([
    scored({
      slug: "both",
      score: 5,
      product: product({ slug: "both", amSuitable: true, pmSuitable: true }),
    }),
  ])

  assert.equal(routine.am.length, 1)
  assert.equal(routine.pm.length, 1)
})

test("sunscreen stays out of the evening", () => {
  const routine = buildRoutine([
    scored({
      slug: "spf",
      score: 5,
      product: product({
        slug: "spf",
        routineCategory: "sunscreen",
        routineStep: 90,
        amSuitable: true,
        pmSuitable: false,
      }),
    }),
  ])

  assert.deepEqual(routine.am.map((e) => e.slug), ["spf"])
  assert.deepEqual(routine.pm, [])
})

test("an unplaced product sorts last rather than first", () => {
  // Defaulting a missing step to zero would put an unassessed product ahead of
  // the cleanser.
  const routine = buildRoutine([
    scored({ slug: "unknown", score: 9, product: product({ slug: "unknown" }) }),
    scored({
      slug: "cleanser",
      score: 1,
      product: product({ slug: "cleanser", routineStep: 10 }),
    }),
  ])

  assert.deepEqual(routine.am.map((e) => e.slug), ["cleanser", "unknown"])
})

test("a product suitable at neither time is surfaced, not silently dropped", () => {
  const routine = buildRoutine([
    scored({
      slug: "broken",
      score: 5,
      product: product({ slug: "broken", amSuitable: false, pmSuitable: false }),
    }),
  ])

  assert.deepEqual(routine.unplaced.map((e) => e.slug), ["broken"])
  assert.deepEqual(routine.am, [])
})

// ── Surface: a face scan cannot recommend a scalp oil ────────────────────────

test("a face scan does not justify a hair product", () => {
  // Found by running the engine against the real catalogue: a hair oil scored
  // 9.89 into a facial routine because it declares dryness and the face scan
  // found dryness. The arithmetic was right; the premise was not.
  const ctx = context({
    concerns: deriveConcerns({ dimensions: [{ id: "hydration", band: "elevated" }] }),
  })

  const hairOil = scoreProduct(
    product({ slug: "hair-oil", targetConcerns: ["dryness"], routineCategory: "haircare" }),
    ctx,
    DEFAULT_WEIGHTS,
  )
  const faceCream = scoreProduct(
    product({ slug: "cream", targetConcerns: ["dryness"], routineCategory: "moisturiser" }),
    ctx,
    DEFAULT_WEIGHTS,
  )

  assert.equal(hairOil.score, 0)
  assert.ok(faceCream.score > 0)
})

test("a stated concern does justify a hair product", () => {
  // The person said it about themselves rather than about the photograph.
  const ctx = context({ concerns: deriveConcerns({ primaryConcerns: ["dryness"] }) })

  const hairOil = scoreProduct(
    product({ slug: "hair-oil", targetConcerns: ["dryness"], routineCategory: "haircare" }),
    ctx,
    DEFAULT_WEIGHTS,
  )

  assert.ok(hairOil.score > 0)
})

test("a hair concern never justifies a face product", () => {
  const ctx = context({ concerns: deriveConcerns({ primaryConcerns: ["dandruff"] }) })

  const cleanser = scoreProduct(
    product({ slug: "wash", targetConcerns: ["dandruff"], routineCategory: "cleanser" }),
    ctx,
    DEFAULT_WEIGHTS,
  )
  const shampoo = scoreProduct(
    product({ slug: "shampoo", targetConcerns: ["dandruff"], routineCategory: "haircare" }),
    ctx,
    DEFAULT_WEIGHTS,
  )

  assert.equal(cleanser.score, 0)
  assert.ok(shampoo.score > 0)
})

test("an unclassified product is treated as a face product rather than dropped", () => {
  // The permissive default surfaces the data gap instead of silently shrinking
  // the catalogue.
  const ctx = context({
    concerns: deriveConcerns({ dimensions: [{ id: "hydration", band: "elevated" }] }),
  })

  const unplaced = scoreProduct(
    product({ slug: "unplaced", targetConcerns: ["dryness"], routineCategory: null }),
    ctx,
    DEFAULT_WEIGHTS,
  )

  assert.ok(unplaced.score > 0)
})

test("relevance excludes the hair product with a reason, not a silent zero", () => {
  const ctx = context({
    concerns: deriveConcerns({ dimensions: [{ id: "hydration", band: "elevated" }] }),
  })

  const { safe, excluded } = requireConcernMatch(
    [
      product({ slug: "hair-oil", targetConcerns: ["dryness"], routineCategory: "haircare" }),
      product({ slug: "cream", targetConcerns: ["dryness"], routineCategory: "moisturiser" }),
    ],
    ctx,
  )

  assert.deepEqual(safe.map((p) => p.slug), ["cream"])
  assert.equal(excluded[0].reason, "no_concern_match")
})

test("a hair product is recommended but is not a step in a facial routine", () => {
  // routineStep orders a face routine. Sorting a hair oil in by step put it
  // last and read as "and finally, apply the hair oil to your face".
  const routine = buildRoutine([
    scored({
      slug: "cream",
      score: 9,
      product: product({ slug: "cream", routineCategory: "moisturiser", routineStep: 70 }),
    }),
    scored({
      slug: "hair-oil",
      score: 8,
      product: product({ slug: "hair-oil", routineCategory: "haircare", routineStep: 100 }),
    }),
  ])

  assert.deepEqual(routine.am.map((e) => e.slug), ["cream"])
  assert.deepEqual(routine.additional.map((e) => e.slug), ["hair-oil"])
  assert.equal(routine.additional[0].surface, "hair")
})
