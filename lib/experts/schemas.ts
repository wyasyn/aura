import { z } from "zod"

import { EXPERT_SPECIALTIES } from "@/lib/experts/types"

export const expertApplicationSchema = z.object({
  specialty: z.enum(EXPERT_SPECIALTIES),
  headline: z.string().trim().min(4, "Add a short headline").max(120),
  bio: z.string().trim().min(40, "Write at least a few sentences").max(2000),
  credentials: z
    .string()
    .trim()
    .min(10, "List your qualifications and licenses")
    .max(2000),
  yearsExperience: z.number().int().min(0).max(80),
  consultationPriceCents: z.number().int().min(500, "Minimum $5.00").max(100_000),
})

export type ExpertApplicationInput = z.infer<typeof expertApplicationSchema>
