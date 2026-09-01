import { z } from "zod"

/**
 * Client-side auth validation.
 *
 * The forms previously relied on HTML `required`/`minLength` alone, which gave
 * browser-chrome messages, no field-level feedback, and no password strength
 * signal. better-auth stays authoritative on the server; this exists so the
 * user hears about a typo before a round trip.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .email("That does not look like an email address")

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "That password is too long")

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
})

export const signUpSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const otpRequestSchema = z.object({ email })

export type PasswordStrength = {
  /** 0 to 4. */
  score: number
  label: string
  /** The single most useful next improvement, or null when already strong. */
  hint: string | null
}

/**
 * A deliberately simple strength estimate: length plus character variety.
 *
 * Not a substitute for a breach check, and it is not used to block anything.
 * Its job is to nudge, so it reports one actionable hint rather than a list.
 */
export function estimatePasswordStrength(value: string): PasswordStrength {
  if (!value) {
    return { score: 0, label: "", hint: null }
  }

  const checks = {
    length: value.length >= 12,
    minimum: value.length >= 8,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    digit: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  }

  let score = 0
  if (checks.minimum) score += 1
  if (checks.length) score += 1
  if (checks.lower && checks.upper) score += 1
  if (checks.digit || checks.symbol) score += 1

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"]

  let hint: string | null = null
  if (!checks.minimum) {
    hint = "Use at least 8 characters"
  } else if (!checks.length) {
    hint = "Longer is stronger: aim for 12 or more"
  } else if (!(checks.lower && checks.upper)) {
    hint = "Mix upper and lower case"
  } else if (!checks.digit && !checks.symbol) {
    hint = "Add a number or symbol"
  }

  return { score, label: labels[score] ?? "", hint }
}
