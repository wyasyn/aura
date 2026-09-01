import { z } from "zod"

export const submitReviewSchema = z.object({
  bookingId: z.string().trim().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
})
