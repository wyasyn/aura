import { z } from "zod"

export const affiliateApplicationSchema = z.object({
  howTheyPromote: z
    .string()
    .trim()
    .min(40, "Write at least a few sentences")
    .max(2000),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export type AffiliateApplicationInput = z.infer<typeof affiliateApplicationSchema>
