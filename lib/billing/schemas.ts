import { z } from "zod"

import { cardSchema } from "@/lib/payments/card-schema"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .default(null)

export const billingProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: optionalText(40),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(120),
  state: optionalText(120),
  postalCode: optionalText(40),
  country: z
    .string()
    .trim()
    .length(2, "Use a two letter country code")
    .toUpperCase(),
  taxId: optionalText(60),
})

export type BillingProfileInput = z.infer<typeof billingProfileSchema>

export const startCheckoutSchema = z.object({
  packId: z.string().trim().min(1, "Choose a pack"),
})

export const confirmPaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
  card: cardSchema,
})
