import { GoogleGenAI, type Content, type ThinkingLevel } from "@google/genai"

import { skinAssessmentJsonSchema } from "@/lib/ai/schemas/assessment"
import { buildAnalyzeContents } from "@/lib/ai/prompts/system"
import type { AnalyzeSkinInput, AnalyzeSkinResult } from "@/lib/ai/types"
import { partitionRecommendationsByAllergies } from "@/lib/products/filter-recommendations-by-allergies"
import { selectCatalogRecommendations } from "@/lib/products/validate-catalog-recommendations"
import { SKIN_DISCLAIMER } from "@/lib/scan/constants"
import { normalizeDimensions } from "@/lib/scan/normalize-dimensions"
import { skinAssessmentSchema } from "@/lib/scan/schemas"
import type { SkinAssessment } from "@/lib/scan/types"
import {
  mapGeminiUsageMetadata,
  sumGeminiUsage,
  type MappedGeminiUsage,
} from "@/lib/ai/providers/gemini-usage"

const MIN_NATURAL_RECOMMENDATIONS = 3
const MAX_NATURAL_RECOMMENDATIONS = 4
const MIN_PRODUCT_RECOMMENDATIONS = 2

/**
 * A validation failure that the model can plausibly fix if told what went
 * wrong, as opposed to a transport or schema failure that it cannot.
 */
type RepairableFailure = {
  /** Message surfaced to the user if the repair attempt also fails. */
  error: string
  /** Corrective turn appended to the conversation for the retry. */
  correction: string
}

class AssessmentValidationError extends Error {
  readonly correction: string

  constructor(failure: RepairableFailure) {
    super(failure.error)
    this.name = "AssessmentValidationError"
    this.correction = failure.correction
  }
}

/**
 * Applies every post-generation rule that the JSON schema cannot express:
 * recommendation counts, catalog membership, and allergy safety. Throws an
 * {@link AssessmentValidationError} carrying the corrective turn to use on a
 * retry.
 */
async function validateAssessment(
  assessment: ReturnType<typeof skinAssessmentSchema.parse>,
  catalogSlugs: Set<string>,
  allergies: string | null | undefined,
): Promise<SkinAssessment> {
  const naturalRecommendations = assessment.naturalRecommendations.slice(
    0,
    MAX_NATURAL_RECOMMENDATIONS,
  )

  if (naturalRecommendations.length < MIN_NATURAL_RECOMMENDATIONS) {
    throw new AssessmentValidationError({
      error: "Model returned insufficient natural recommendations",
      correction: `Your previous response contained only ${naturalRecommendations.length} naturalRecommendations. Return the full assessment again with at least ${MIN_NATURAL_RECOMMENDATIONS} naturalRecommendations, each tied to a specific finding in this scan.`,
    })
  }

  const { valid, invalidSlugs } = selectCatalogRecommendations(
    assessment.recommendations,
    catalogSlugs,
  )

  if (invalidSlugs.length > 0 && valid.length < MIN_PRODUCT_RECOMMENDATIONS) {
    throw new AssessmentValidationError({
      error: "Model returned invalid product recommendations",
      correction: `These product ids are not in the catalog and were rejected: ${invalidSlugs.join(", ")}. Return the full assessment again using at least ${MIN_PRODUCT_RECOMMENDATIONS} product ids copied exactly from the catalog JSON.`,
    })
  }

  const { safe, excluded } = await partitionRecommendationsByAllergies(
    valid,
    allergies,
  )

  if (safe.length < MIN_PRODUCT_RECOMMENDATIONS) {
    const excludedSlugs = excluded.map((item) => item.id)
    const detail =
      excludedSlugs.length > 0
        ? `These products conflict with the user's stated allergies (${allergies}) and were rejected: ${excludedSlugs.join(", ")}.`
        : `Only ${safe.length} usable product recommendations came through.`

    throw new AssessmentValidationError({
      error: "Model returned invalid product recommendations",
      correction: `${detail} Return the full assessment again with at least ${MIN_PRODUCT_RECOMMENDATIONS} different catalog products whose ingredient lists contain none of the user's allergens.`,
    })
  }

  return {
    ...assessment,
    dimensions: normalizeDimensions(assessment.dimensions),
    naturalRecommendations,
    recommendations: safe,
  }
}

function parseAssessmentText(text: string | undefined) {
  if (!text) {
    throw new Error("Empty response from Gemini")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("Invalid JSON from Gemini")
  }

  return skinAssessmentSchema.parse({
    ...(parsed as object),
    disclaimer: SKIN_DISCLAIMER,
  })
}

export async function analyzeWithGemini(
  input: AnalyzeSkinInput,
): Promise<AnalyzeSkinResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const ai = new GoogleGenAI({ apiKey })
  const { systemInstruction, contents } = buildAnalyzeContents(
    input,
    input.activeClimateTags ?? [],
  )
  const catalogSlugs = new Set(input.catalog.map((product) => product.slug))
  const allergies = input.userContext.profile?.allergies ?? null
  const startedAt = Date.now()

  const thinkingLevel = input.model.thinkingLevel
  const useThinking = thinkingLevel && input.model.modelId.startsWith("gemini-3.")

  const config = {
    systemInstruction,
    responseMimeType: "application/json",
    responseJsonSchema: skinAssessmentJsonSchema,
    temperature: 0.4,
    ...(useThinking
      ? { thinkingConfig: { thinkingLevel: thinkingLevel as ThinkingLevel } }
      : {}),
  }

  const generate = async (turns: Content[]) => {
    const response = await ai.models.generateContent({
      model: input.model.modelId,
      contents: turns,
      config,
    })

    return {
      text: response.text,
      usage: mapGeminiUsageMetadata(
        input.model.provider,
        input.model.modelId,
        response.usageMetadata,
      ),
    }
  }

  const first = await generate(contents)
  let usage: MappedGeminiUsage = first.usage
  let assessment: SkinAssessment

  try {
    assessment = await validateAssessment(
      parseAssessmentText(first.text),
      catalogSlugs,
      allergies,
    )
  } catch (err) {
    if (!(err instanceof AssessmentValidationError)) {
      throw err
    }

    // One repair attempt. The model sees its own rejected output plus a
    // specific description of the rule it broke, which it can usually satisfy
    // without another full analysis pass.
    const repairTurns: Content[] = [
      ...contents,
      { role: "model", parts: [{ text: first.text ?? "" }] },
      { role: "user", parts: [{ text: err.correction }] },
    ]

    const retry = await generate(repairTurns)
    usage = sumGeminiUsage(first.usage, retry.usage)

    assessment = await validateAssessment(
      parseAssessmentText(retry.text),
      catalogSlugs,
      allergies,
    )
  }

  return {
    assessment,
    usage,
    latencyMs: Date.now() - startedAt,
  }
}
