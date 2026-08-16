import { z } from "zod"

import { SKIN_DIMENSION_IDS } from "@/lib/scan/dimensions"
import { SKIN_DOSHA_VALUES } from "@/lib/scan/dosha"
import type { SkinAssessment } from "@/lib/scan/types"

const assessmentBandSchema = z.enum([
  "minimal",
  "mild",
  "moderate",
  "elevated",
  "not_assessed",
])

const applicationTimeSchema = z.enum([
  "morning",
  "evening",
  "anytime",
  "morning_and_evening",
])

const applicationFrequencySchema = z.enum([
  "once_daily",
  "twice_daily",
  "as_needed",
  "few_times_weekly",
  "weekly",
])

const skinDimensionSchema = z.object({
  id: z.enum(SKIN_DIMENSION_IDS),
  label: z.string(),
  band: assessmentBandSchema,
  note: z.string(),
})

const doshaTypingSchema = z.object({
  primary: z.enum(SKIN_DOSHA_VALUES),
  secondary: z.enum(SKIN_DOSHA_VALUES).nullable().optional(),
  note: z.string(),
})

export const skinAssessmentSchema = z.object({
  overallBand: assessmentBandSchema,
  dimensions: z.array(skinDimensionSchema).length(SKIN_DIMENSION_IDS.length),
  doshaTyping: doshaTypingSchema,
  summary: z.string(),
  concernsNotVisible: z
    .array(
      z.object({
        concern: z.string(),
        note: z.string(),
      }),
    )
    .default([]),
  naturalRecommendations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      applicationTime: applicationTimeSchema,
      applicationFrequency: applicationFrequencySchema,
    }),
  ),
  recommendations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      reason: z.string(),
      applicationTime: applicationTimeSchema,
      applicationFrequency: applicationFrequencySchema,
      imageUrl: z.string().url().nullable().optional(),
      storeUrl: z.string().url().nullable().optional(),
    }),
  ),
  disclaimer: z.string(),
}) satisfies z.ZodType<SkinAssessment>

export const saveScanResultSchema = z.object({
  assessment: skinAssessmentSchema,
  usage: z
    .object({
      provider: z.enum(["gemini", "vercel_ai", "openrouter", "other"]),
      modelId: z.string(),
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
      cachedTokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
})
