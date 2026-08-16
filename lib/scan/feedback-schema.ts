import { z } from "zod"

export const scanFeedbackInputSchema = z.object({
  scanId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  message: z.string().max(2000).optional(),
})

export type ScanFeedbackInput = z.infer<typeof scanFeedbackInputSchema>
