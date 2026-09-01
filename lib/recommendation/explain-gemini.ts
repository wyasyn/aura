import { GoogleGenAI, Type } from "@google/genai"
import { z } from "zod"

import { mapGeminiUsageMetadata, type MappedGeminiUsage } from "@/lib/ai/providers/gemini-usage"
import { concernPhrase } from "@/lib/recommendation/explain"
import type { ScoredCandidate } from "@/lib/recommendation/types"

/**
 * Gemini's job in the recommendation pipeline, in full: phrasing.
 *
 * It is handed a fixed list of products the engine already chose, together with
 * the concerns each was scored against and the actives the ingredient join
 * confirms are in it, and asked to write one sentence per product. It cannot
 * add a product, remove one, or reorder them — it is never shown the catalogue,
 * so there is nothing else it could name, and any slug it returns that was not
 * in the list is discarded rather than looked up.
 *
 * This is the inversion. The model used to select; now it describes a selection
 * it had no part in.
 */

const explanationSchema = z.object({
  reasons: z
    .array(
      z.object({
        slug: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
})

const explanationJsonSchema = {
  type: Type.OBJECT,
  required: ["reasons"],
  properties: {
    reasons: {
      type: Type.ARRAY,
      description:
        "One entry per supplied product, using the slugs exactly as given. Do not add products.",
      items: {
        type: Type.OBJECT,
        required: ["slug", "reason"],
        properties: {
          slug: {
            type: Type.STRING,
            description: "The product slug exactly as supplied.",
          },
          reason: {
            type: Type.STRING,
            description:
              "One sentence, at most 25 words, saying why this product suits this person. Ground it in the supplied findings and ingredients only.",
          },
        },
      },
    },
  },
} as const

const SYSTEM_INSTRUCTION = `You write the one-line reason shown under a skincare product recommendation.

The products have already been chosen. You are not choosing them, ranking them,
or judging whether they are appropriate — that decision is made and is not
yours to revisit.

For each product you are given the cosmetic findings it was selected to address
and, where known, the active ingredients it contains. Write one sentence saying
why it suits this person.

Rules:
- Use only the findings and ingredients supplied for that product. Never
  introduce a benefit, ingredient or finding that is not in its entry.
- Cosmetic language only. Never diagnose and never name a clinical condition:
  say uneven tone, not hyperpigmentation; blemish-prone, not acne; congestion,
  not oiliness.
- Address the reader as "your". One sentence, at most 25 words, no lists.
- Do not state how or when to apply it. Timing is shown separately.
- Return exactly one entry per product, using the slugs exactly as supplied.`

export type ExplanationInput = {
  candidates: ScoredCandidate[]
  /** The scan's own summary, so the wording can echo what the person just read. */
  summary?: string | null
  modelId: string
}

export type ExplanationResult = {
  /** Slug to model-written reason. Only ever contains supplied slugs. */
  reasons: Map<string, string>
  usage: MappedGeminiUsage
}

function buildPrompt(input: ExplanationInput): string {
  const products = input.candidates.map((candidate) => {
    const findings = candidate.citableConcerns.map(concernPhrase)
    const actives = candidate.citableIngredients

    return [
      `slug: ${candidate.product.slug}`,
      `name: ${candidate.product.name}`,
      `selected for: ${findings.length > 0 ? findings.join(", ") : "(no specific finding)"}`,
      `contains: ${actives.length > 0 ? actives.join(", ") : "(no confirmed actives)"}`,
    ].join("\n")
  })

  return [
    input.summary?.trim()
      ? `What this person was told about their skin:\n${input.summary}`
      : `No scan summary is available.`,
    ``,
    `Products, already chosen:`,
    products.join("\n\n"),
  ].join("\n")
}

export async function explainWithGemini(
  input: ExplanationInput,
): Promise<ExplanationResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: input.modelId,
    contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseJsonSchema: explanationJsonSchema,
      temperature: 0.4,
    },
  })

  const usage = mapGeminiUsageMetadata("gemini", input.modelId, response.usageMetadata)

  if (!response.text) {
    return { reasons: new Map(), usage }
  }

  const parsed = explanationSchema.safeParse(JSON.parse(response.text))
  if (!parsed.success) {
    return { reasons: new Map(), usage }
  }

  return { reasons: selectSuppliedReasons(parsed.data.reasons, input.candidates), usage }
}

/**
 * Keeps only reasons for products that were actually supplied.
 *
 * A slug the engine did not select is discarded rather than resolved. The model
 * has no route to add a product here — but "no route" is an argument about the
 * prompt, and this is the check that makes it a property of the code.
 */
export function selectSuppliedReasons(
  reasons: Array<{ slug: string; reason: string }>,
  candidates: ScoredCandidate[],
): Map<string, string> {
  const allowed = new Set(candidates.map((candidate) => candidate.product.slug))
  const selected = new Map<string, string>()

  for (const { slug, reason } of reasons) {
    if (!allowed.has(slug)) continue
    const trimmed = reason.trim()
    if (!trimmed) continue
    // First wins. A duplicate slug is a malformed response, and taking the
    // last would let a later entry silently overwrite a good earlier one.
    if (!selected.has(slug)) selected.set(slug, trimmed)
  }

  return selected
}
