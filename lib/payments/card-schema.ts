import { z } from "zod"

import { normalizeCardNumber } from "./test-cards"

function isFutureExpiry(value: string): boolean {
  const [rawMonth, rawYear] = value.split("/")
  const month = Number(rawMonth)
  const year = 2000 + Number(rawYear)
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return false
  }
  // Card is valid through the last day of its expiry month.
  return new Date(year, month, 1) > new Date()
}

export const cardSchema = z.object({
  number: z
    .string()
    .transform(normalizeCardNumber)
    .refine((value) => value.length >= 13 && value.length <= 19, {
      message: "Enter a valid card number",
    }),
  expiry: z
    .string()
    .trim()
    .regex(/^\d{2}\/\d{2}$/, "Use MM/YY")
    .refine(isFutureExpiry, "Card has expired"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "Enter a valid CVC"),
  name: z.string().trim().min(2, "Enter the name on the card"),
})

export type CardFormValues = z.infer<typeof cardSchema>

export function getCardBrand(number: string): string {
  const digits = normalizeCardNumber(number)
  if (/^4/.test(digits)) return "Visa"
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard"
  if (/^3[47]/.test(digits)) return "Amex"
  if (/^6(?:011|5)/.test(digits)) return "Discover"
  return "Card"
}

export function getCardLast4(number: string): string {
  return normalizeCardNumber(number).slice(-4)
}
