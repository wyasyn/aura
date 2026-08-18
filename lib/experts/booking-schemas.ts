import { z } from "zod"

import { cardSchema } from "@/lib/payments/card-schema"

export const startBookingCheckoutSchema = z.object({
  slotId: z.string().trim().min(1, "Choose a time"),
  notes: z.string().trim().max(1000).optional(),
})

export const confirmBookingPaymentSchema = z.object({
  bookingId: z.string().trim().min(1),
  card: cardSchema,
})

export const confirmBookingStripePaymentSchema = z.object({
  bookingId: z.string().trim().min(1),
})
