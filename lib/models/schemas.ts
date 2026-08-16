import { z } from "zod"

import { SCAN_TIERS, THINKING_LEVELS } from "@/lib/models/types"

export const modelRateFormSchema = z.object({
  provider: z.enum(["gemini", "vercel_ai", "openrouter", "other"]),
  modelId: z.string().min(1).max(120),
  displayName: z.string().max(200).optional(),
  inputMicrosPer1M: z.number().int().positive(),
  outputMicrosPer1M: z.number().int().positive(),
  cachedInputMicrosPer1M: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  supportsVision: z.boolean().default(true),
  supportsLive: z.boolean().default(false),
  thinkingLevel: z.enum(THINKING_LEVELS).nullable().optional(),
})

export const assignModelTierSchema = z.object({
  tier: z.enum(SCAN_TIERS).nullable(),
})

export type ModelRateFormInput = z.infer<typeof modelRateFormSchema>
