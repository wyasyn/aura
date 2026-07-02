export type CosmeticBand = "balanced" | "low" | "mild" | "moderate" | "not_visible"

export type SkinAnalysisResult = {
  summary: string
  cosmeticFindings: Array<{
    label: string
    band: CosmeticBand
    observation: string
  }>
  recommendations: Array<{
    title: string
    reason: string
  }>
  routineTips: string[]
  quality: {
    lighting: "clear" | "uneven" | "low_light" | "not_visible"
    framing: "centered" | "partial_face" | "unclear"
    confidence: "low" | "medium" | "high"
  }
  disclaimer: string
  source: "gemini" | "fallback"
  model: string
}

type AnalyzeSkinImageInput = {
  imageBuffer: Buffer
  mimeType: string
}

type GeminiResponsePayload = {
  output_text?: unknown
  outputText?: unknown
  output?: unknown
}

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
const DEFAULT_MODEL = "gemini-3.5-flash"
const DISCLAIMER =
  "Aurora SkinSense provides cosmetic wellness guidance only. This is not a medical diagnosis, treatment plan, or substitute for professional medical advice."

const analysisSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    cosmeticFindings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          band: {
            type: "string",
            enum: ["balanced", "low", "mild", "moderate", "not_visible"],
          },
          observation: { type: "string" },
        },
        required: ["label", "band", "observation"],
      },
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
        },
        required: ["title", "reason"],
      },
    },
    routineTips: {
      type: "array",
      items: { type: "string" },
    },
    quality: {
      type: "object",
      properties: {
        lighting: {
          type: "string",
          enum: ["clear", "uneven", "low_light", "not_visible"],
        },
        framing: {
          type: "string",
          enum: ["centered", "partial_face", "unclear"],
        },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
      },
      required: ["lighting", "framing", "confidence"],
    },
    disclaimer: { type: "string" },
  },
  required: [
    "summary",
    "cosmeticFindings",
    "recommendations",
    "routineTips",
    "quality",
    "disclaimer",
  ],
}

export class GeminiAdapterError extends Error {
  constructor(
    message: string,
    readonly code: "missing_api_key" | "request_failed" | "invalid_response",
  ) {
    super(message)
    this.name = "GeminiAdapterError"
  }
}

export async function analyzeSkinImage({
  imageBuffer,
  mimeType,
}: AnalyzeSkinImageInput): Promise<SkinAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          type: "text",
          text: buildSkinAnalysisPrompt(),
        },
        {
          type: "image",
          data: imageBuffer.toString("base64"),
          mime_type: mimeType,
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: analysisSchema,
      },
      generation_config: {
        thinking_level: "minimal",
      },
    }),
  })

  if (!response.ok) {
    throw new GeminiAdapterError(
      `Gemini request failed with status ${response.status}.`,
      "request_failed",
    )
  }

  const payload = (await response.json()) as GeminiResponsePayload
  const outputText = extractOutputText(payload)

  if (!outputText) {
    throw new GeminiAdapterError("Gemini did not return JSON text.", "invalid_response")
  }

  try {
    const parsed = JSON.parse(outputText) as unknown
    return normalizeAnalysisResult(parsed, model, "gemini")
  } catch {
    throw new GeminiAdapterError("Gemini returned invalid JSON.", "invalid_response")
  }
}

export function buildFallbackSkinAnalysis(model = "fallback"): SkinAnalysisResult {
  return {
    summary:
      "We could not complete the live AI review, so this fallback report keeps guidance general and cosmetic-only.",
    cosmeticFindings: [
      {
        label: "Image quality",
        band: "not_visible",
        observation: "A live cosmetic reading was not available for this image.",
      },
      {
        label: "Visible texture",
        band: "not_visible",
        observation: "Please retry with even lighting for a more useful cosmetic review.",
      },
    ],
    recommendations: [
      {
        title: "Retry scan",
        reason: "A clearer scan lets Aurora produce more specific cosmetic guidance.",
      },
      {
        title: "Gentle daily routine",
        reason: "Cleanse, moisturize, and use daytime sun protection as general wellness care.",
      },
    ],
    routineTips: [
      "Use soft, even lighting and keep your face centered.",
      "Remove heavy shadows before retrying.",
      "Treat this as cosmetic wellness guidance only.",
    ],
    quality: {
      lighting: "not_visible",
      framing: "unclear",
      confidence: "low",
    },
    disclaimer: DISCLAIMER,
    source: "fallback",
    model,
  }
}

function buildSkinAnalysisPrompt() {
  return `
You are Aurora SkinSense, an AI cosmetic wellness assistant for a skincare SaaS.
Analyze the uploaded face image for visible cosmetic skin indicators only.

Rules:
- Return strict JSON only matching the provided schema.
- Do not include Markdown, prose outside JSON, or code fences.
- Do not diagnose medical conditions.
- Do not mention disease, treatment, prescriptions, pathology, lesions, cancer, infection, or clinical certainty.
- Use coarse cosmetic bands only: balanced, low, mild, moderate, not_visible.
- If the image is unclear, say so and lower confidence.
- Keep recommendations general and Aurora skincare-oriented without claiming medical outcomes.
- Include this exact disclaimer: "${DISCLAIMER}"

Assess visible cosmetic categories such as texture appearance, tone unevenness, redness appearance, hydration/dryness appearance, lighting quality, and framing.
`.trim()
}

function extractOutputText(payload: GeminiResponsePayload): string | null {
  if (typeof payload.output_text === "string") return payload.output_text
  if (typeof payload.outputText === "string") return payload.outputText

  const outputText = findStringByKey(payload.output, "text")
  return outputText
}

function findStringByKey(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, key)
      if (found) return found
    }
    return null
  }

  const record = value as Record<string, unknown>
  if (typeof record[key] === "string") return record[key]

  for (const item of Object.values(record)) {
    const found = findStringByKey(item, key)
    if (found) return found
  }

  return null
}

function normalizeAnalysisResult(
  value: unknown,
  model: string,
  source: SkinAnalysisResult["source"],
): SkinAnalysisResult {
  const record = asRecord(value)
  const quality = asRecord(record.quality)

  return {
    summary: asString(record.summary, "Cosmetic skin report generated."),
    cosmeticFindings: asArray(record.cosmeticFindings)
      .map((item) => normalizeFinding(item))
      .filter((item) => item.label && item.observation)
      .slice(0, 6),
    recommendations: asArray(record.recommendations)
      .map((item) => normalizeRecommendation(item))
      .filter((item) => item.title && item.reason)
      .slice(0, 4),
    routineTips: asArray(record.routineTips)
      .map((item) => asString(item, ""))
      .filter(Boolean)
      .slice(0, 5),
    quality: {
      lighting: asLighting(quality.lighting),
      framing: asFraming(quality.framing),
      confidence: asConfidence(quality.confidence),
    },
    disclaimer: DISCLAIMER,
    source,
    model,
  }
}

function normalizeFinding(value: unknown) {
  const record = asRecord(value)

  return {
    label: asString(record.label, ""),
    band: asBand(record.band),
    observation: asString(record.observation, ""),
  }
}

function normalizeRecommendation(value: unknown) {
  const record = asRecord(value)

  return {
    title: asString(record.title, ""),
    reason: asString(record.reason, ""),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function asBand(value: unknown): CosmeticBand {
  if (
    value === "balanced" ||
    value === "low" ||
    value === "mild" ||
    value === "moderate" ||
    value === "not_visible"
  ) {
    return value
  }

  return "not_visible"
}

function asLighting(value: unknown): SkinAnalysisResult["quality"]["lighting"] {
  if (value === "clear" || value === "uneven" || value === "low_light" || value === "not_visible") {
    return value
  }

  return "not_visible"
}

function asFraming(value: unknown): SkinAnalysisResult["quality"]["framing"] {
  if (value === "centered" || value === "partial_face" || value === "unclear") {
    return value
  }

  return "unclear"
}

function asConfidence(value: unknown): SkinAnalysisResult["quality"]["confidence"] {
  if (value === "low" || value === "medium" || value === "high") {
    return value
  }

  return "low"
}
