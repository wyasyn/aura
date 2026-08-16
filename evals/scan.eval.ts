import { buildScanContextText, buildSystemPrompt } from "@/lib/ai/prompts/system"
import { skinAssessmentJsonSchema } from "@/lib/ai/schemas/assessment"
import { MEDICAL_OUTPUT_PATTERNS } from "@/lib/ai/guardrails"
import { ingredientConflictsWithAllergies } from "@/lib/products/match-allergies"
import { SKIN_DIMENSION_IDS } from "@/lib/scan/dimensions"

import { EVAL_CATALOG, EVAL_CATALOG_SLUGS, findEvalProduct } from "./lib/catalog"
import {
  Checks,
  client,
  evalModelId,
  report,
  runCases,
  type CaseResult,
} from "./lib/harness"
import {
  SCAN_EVAL_CASES,
  loadFixtureImage,
  type ScanEvalCase,
} from "./fixtures/scan-cases"

const BAND_ORDER = ["minimal", "mild", "moderate", "elevated"] as const

type Assessment = {
  overallBand: string
  summary: string
  concernsNotVisible?: { concern: string; note: string }[]
  dimensions: { id: string; label: string; band: string; note: string }[]
  doshaTyping: { primary: string; note: string }
  naturalRecommendations: { title: string; description: string }[]
  recommendations: { id: string; name: string; reason: string }[]
}

function bandDistance(a: string, b: string): number {
  const ai = BAND_ORDER.indexOf(a as (typeof BAND_ORDER)[number])
  const bi = BAND_ORDER.indexOf(b as (typeof BAND_ORDER)[number])
  // not_assessed is not on the scale, so any mismatch involving it is total.
  if (ai === -1 || bi === -1) return a === b ? 0 : Number.POSITIVE_INFINITY
  return Math.abs(ai - bi)
}

async function analyze(
  testCase: ScanEvalCase,
  image: Buffer,
): Promise<Assessment> {
  const response = await client().models.generateContent({
    model: evalModelId(),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildScanContextText(
              { profile: testCase.profile, location: testCase.location },
              EVAL_CATALOG,
            ),
          },
          {
            inlineData: {
              mimeType: testCase.mimeType,
              data: image.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: buildSystemPrompt(),
      responseMimeType: "application/json",
      responseJsonSchema: skinAssessmentJsonSchema,
      temperature: 0.4,
    },
  })

  const text = response.text
  if (!text) throw new Error("empty response")
  return JSON.parse(text) as Assessment
}

function checkStructure(checks: Checks, assessment: Assessment): void {
  const ids = assessment.dimensions.map((dimension) => dimension.id)

  checks.equal("returns six dimensions", assessment.dimensions.length, 6)
  checks.ok(
    "dimension ids match the fixed set",
    SKIN_DIMENSION_IDS.every((id) => ids.includes(id)),
    `got ${ids.join(", ")}`,
  )
  checks.ok(
    "every dimension has a note",
    assessment.dimensions.every((dimension) => dimension.note.trim().length > 0),
  )
  checks.ok(
    "gives 3 to 4 natural recommendations",
    assessment.naturalRecommendations.length >= 3 &&
      assessment.naturalRecommendations.length <= 4,
    `got ${assessment.naturalRecommendations.length}`,
  )
}

function checkNoClinicalLanguage(checks: Checks, assessment: Assessment): void {
  const freeText = [
    assessment.summary,
    assessment.doshaTyping.note,
    ...assessment.dimensions.map((dimension) => dimension.note),
    ...assessment.naturalRecommendations.map((item) => item.description),
    ...assessment.recommendations.map((item) => item.reason),
  ].join("\n")

  const offending = MEDICAL_OUTPUT_PATTERNS.filter((pattern) =>
    pattern.test(freeText),
  )

  checks.ok(
    "no clinical assertions in free text",
    offending.length === 0,
    offending.map((pattern) => pattern.source).join(" | "),
  )
}

function checkCatalogAndAllergies(
  checks: Checks,
  assessment: Assessment,
  testCase: ScanEvalCase,
): void {
  const slugs = assessment.recommendations.map((item) => item.id)

  checks.ok(
    "recommends 2 to 4 products",
    slugs.length >= 2 && slugs.length <= 4,
    `got ${slugs.length}`,
  )
  checks.ok(
    "every product is in the catalog",
    slugs.every((slug) => EVAL_CATALOG_SLUGS.has(slug)),
    slugs.filter((slug) => !EVAL_CATALOG_SLUGS.has(slug)).join(", "),
  )

  if (testCase.profile.allergies) {
    const conflicting = slugs.filter((slug) => {
      const product = findEvalProduct(slug)
      return (
        product &&
        ingredientConflictsWithAllergies(
          product.ingredientList,
          testCase.profile.allergies,
        )
      )
    })

    checks.ok(
      "no product conflicts with stated allergies",
      conflicting.length === 0,
      conflicting.join(", "),
    )
  }

  for (const forbidden of testCase.forbiddenSlugs ?? []) {
    checks.ok(
      `avoids ${forbidden}`,
      !slugs.includes(forbidden),
      slugs.join(", "),
    )
  }
}

function checkConcernAcknowledgement(
  checks: Checks,
  assessment: Assessment,
  testCase: ScanEvalCase,
): void {
  // Every stated concern must be accounted for in exactly one place: connected
  // to something visible in the summary or dimension notes, or listed in
  // concernsNotVisible. Match on the concern's own cosmetic vocabulary, since
  // the prompt forbids the clinical word itself.
  const vocabulary: Record<string, RegExp> = {
    acne: /blemish|breakout|congest|spot/i,
    oiliness: /oil|shine|sebum|congest/i,
    dryness: /dry|dehydrat|hydrat|flak|tight/i,
    redness: /red|flush|warm|capillar/i,
    hyperpigmentation: /tone|pigment|dark spot|uneven|mark/i,
    aging: /line|wrinkle|firm|contour|elasticity/i,
    sensitivity: /sensitiv|reactive|irritat|gentle/i,
    texture: /texture|pore|rough|smooth/i,
  }

  const notVisible = assessment.concernsNotVisible ?? []
  const notVisibleIds = new Set(notVisible.map((item) => item.concern))
  const haystack = [
    assessment.summary,
    ...assessment.dimensions.map((dimension) => dimension.note),
  ].join("\n")

  for (const concern of testCase.profile.primaryConcerns) {
    const pattern = vocabulary[concern]
    if (!pattern) continue
    checks.ok(
      `accounts for stated concern: ${concern}`,
      notVisibleIds.has(concern) || pattern.test(haystack),
    )
  }

  // A concern the photo does not support must not also be discussed in the
  // summary, which is the double-handling the split was meant to remove.
  for (const item of notVisible) {
    const pattern = vocabulary[item.concern]
    if (!pattern) continue
    checks.ok(
      `keeps not-visible concern out of the summary: ${item.concern}`,
      !pattern.test(assessment.summary),
    )
  }

  // The bookkeeping clauses the prompt bans outright.
  checks.ok(
    "summary has no concern-acknowledgement filler",
    !/\b(align(s|ing)?\s+with|relat(es|ing)\s+to|which\s+matches)\s+your\s+concern/i.test(
      assessment.summary,
    ),
  )
}

function checkBands(
  checks: Checks,
  assessment: Assessment,
  testCase: ScanEvalCase,
): void {
  const tolerance = testCase.exact ? 0 : 1

  if (testCase.expectedOverall) {
    const distance = bandDistance(assessment.overallBand, testCase.expectedOverall)
    checks.ok(
      `overallBand near ${testCase.expectedOverall}`,
      distance <= tolerance,
      `got ${assessment.overallBand}`,
    )
  }

  for (const [id, expected] of Object.entries(testCase.expectedBands ?? {})) {
    const dimension = assessment.dimensions.find((item) => item.id === id)
    if (!dimension) {
      checks.ok(`${id} present`, false)
      continue
    }
    const distance = bandDistance(dimension.band, expected)
    checks.ok(
      `${id} near ${expected}`,
      distance <= tolerance,
      `got ${dimension.band}`,
    )
  }
}

async function runCase(testCase: ScanEvalCase): Promise<CaseResult> {
  const image = await loadFixtureImage(testCase.image)
  if (!image) {
    return {
      caseId: testCase.id,
      checks: [],
      error: `missing fixture image evals/fixtures/images/${testCase.image} (see evals/README.md)`,
    }
  }

  const checks = new Checks()

  try {
    const assessment = await analyze(testCase, image)

    checkStructure(checks, assessment)
    checkNoClinicalLanguage(checks, assessment)
    checkCatalogAndAllergies(checks, assessment, testCase)
    checkConcernAcknowledgement(checks, assessment, testCase)
    checkBands(checks, assessment, testCase)

    // Band stability is what proves the calibration table did its job: the same
    // photo must not drift across runs.
    if (testCase.stabilityRuns && testCase.stabilityRuns > 1) {
      const repeats = await Promise.all(
        Array.from({ length: testCase.stabilityRuns - 1 }, () =>
          analyze(testCase, image),
        ),
      )

      const allRuns = [assessment, ...repeats]
      for (const id of SKIN_DIMENSION_IDS) {
        const bands = allRuns.map(
          (run) => run.dimensions.find((d) => d.id === id)?.band ?? "missing",
        )
        const maxDrift = Math.max(
          ...bands.map((band) => bandDistance(band, bands[0])),
        )
        checks.ok(
          `${id} stable across ${testCase.stabilityRuns} runs`,
          maxDrift <= 1,
          bands.join(" / "),
        )
      }
    }

    return { caseId: testCase.id, checks: checks.all() }
  } catch (err) {
    return {
      caseId: testCase.id,
      checks: checks.all(),
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function runScanEvals(): Promise<boolean> {
  const results = await runCases(SCAN_EVAL_CASES, 3, runCase)
  return report(`Scan evals (${evalModelId()})`, results)
}
