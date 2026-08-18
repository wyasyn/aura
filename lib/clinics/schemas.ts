import { z } from "zod"

import { isValidHexColor } from "@/lib/clinics/branding"
import { validateSubdomain } from "@/lib/clinics/subdomain"

/** Shared so the create form and the branding form reject colours identically. */
const hexColor = z
  .string()
  .trim()
  .refine((value) => isValidHexColor(value), "Use a hex colour like #2563eb")

const optionalHexColor = z
  .string()
  .trim()
  .max(7)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => value === undefined || isValidHexColor(value),
    "Use a hex colour like #2563eb",
  )

/**
 * Subdomain validation reuses the same rules the router relies on, so a value
 * that would never resolve as a tenant can't be saved in the first place.
 */
const subdomain = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .superRefine((value, ctx) => {
    const result = validateSubdomain(value)
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.error })
    }
  })

export const createClinicSchema = z.object({
  name: z.string().trim().min(2, "Clinic name is required").max(120),
  subdomain,
  displayName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  ownerEmail: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  planId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  /**
   * Grants access without a Stripe subscription, for enterprise agreements
   * billed outside the app and for internal trials. Recorded explicitly rather
   * than inferred, so a comped clinic is always distinguishable from a paying
   * one in the admin list.
   */
  compAccess: z.boolean().default(false),
})

export type CreateClinicInput = z.infer<typeof createClinicSchema>

export const clinicBrandingSchema = z.object({
  displayName: z.string().trim().min(2, "Display name is required").max(120),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => value === undefined || /^https:\/\//i.test(value),
      "Logo URL must start with https://",
    ),
  primaryColor: optionalHexColor,
  accentColor: optionalHexColor,
  supportEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => value === undefined || z.email().safeParse(value).success,
      "Enter a valid email",
    ),
})

export type ClinicBrandingInput = z.infer<typeof clinicBrandingSchema>

export const clinicPlanSchema = z.object({
  name: z.string().trim().min(2, "Plan name is required").max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : undefined)),
  stripePriceId: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  priceCents: z.number().int().min(0).max(100_000_00),
  interval: z.enum(["month", "year"]),
  seatLimit: z.number().int().min(1).max(1000),
  /** Negative encodes unlimited, for bespoke unmetered agreements. */
  monthlyScanQuota: z.number().int().min(-1).max(1_000_000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
})

export type ClinicPlanInput = z.infer<typeof clinicPlanSchema>

export { hexColor }
