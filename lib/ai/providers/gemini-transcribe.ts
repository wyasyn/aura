import { GoogleGenAI } from "@google/genai"

import {
  mapGeminiUsageMetadata,
  type MappedGeminiUsage,
} from "@/lib/ai/providers/gemini-usage"

export const TRANSCRIBE_MODEL_ID = "gemini-2.5-flash"

export type TranscribeAudioInput = {
  audio: Buffer
  mimeType: string
  lang?: string
}

export type TranscribeAudioResult = {
  text: string
  latencyMs: number
  usage: MappedGeminiUsage
}

export async function transcribeWithGemini(
  input: TranscribeAudioInput,
): Promise<TranscribeAudioResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const ai = new GoogleGenAI({ apiKey })
  const startedAt = Date.now()
  const langHint = input.lang?.trim()

  const response = await ai.models.generateContent({
    model: TRANSCRIBE_MODEL_ID,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.audio.toString("base64"),
            },
          },
          {
            text: `Transcribe the spoken audio${
              langHint ? ` (expected language: ${langHint})` : ""
            }. Return only the verbatim transcript with no commentary. If there is no speech, return an empty string.`,
          },
        ],
      },
    ],
    config: {
      temperature: 0,
    },
  })

  const latencyMs = Date.now() - startedAt
  const text = response.text?.trim() ?? ""
  const usage = mapGeminiUsageMetadata(
    "gemini",
    TRANSCRIBE_MODEL_ID,
    response.usageMetadata,
  )

  return { text, latencyMs, usage }
}
