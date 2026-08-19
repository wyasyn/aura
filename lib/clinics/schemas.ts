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

/**
 * Logos are stored inline as data URIs rather than in object storage, which
 * keeps clinic branding self-contained with no external service to configure.
 * The trade-off is that every byte travels with the row, hence the tight cap.
 */
export const MAX_LOGO_BYTES = 1024 * 1024
/** Shown in validation messages and the upload hint, so they cannot disagree. */
export const MAX_LOGO_LABEL = "1MB"
/** Base64 inflates by about a third; leave room for that plus the media prefix. */
const MAX_LOGO_DATA_URI_LENGTH = Math.ceil((MAX_LOGO_BYTES * 4) / 3) + 200

export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const

const DATA_URI_RE = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/]+={0,2})$/

/**
 * Accepts an uploaded data URI, or an https URL for clinics configured before
 * uploads existed — rejecting those would blank their logo on the next save.
 */
function isAllowedLogoSource(value: string): boolean {
  if (/^https:\/\//i.test(value)) return true
  return DATA_URI_RE.test(value)
}

/** Decoded size of a data URI, so the cap is on the real image, not the string. */
function logoByteLength(value: string): number {
  const match = DATA_URI_RE.exec(value)
  if (!match) return 0

  const base64 = match[2]
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

export const clinicBrandingSchema = z.object({
  displayName: z.string().trim().min(2, "Display name is required").max(120),
  logoUrl: z
    .string()
    .trim()
    // A backstop so an enormous string is rejected before it is decoded. It
    // carries the same message as the byte check below, which is the real
    // limit — otherwise an oversized upload surfaces a raw character count.
    .max(MAX_LOGO_DATA_URI_LENGTH, `Logo must be ${MAX_LOGO_LABEL} or smaller.`)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => value === undefined || isAllowedLogoSource(value),
      "Upload a PNG, JPG, WebP or SVG image.",
    )
    .refine(
      (value) => value === undefined || logoByteLength(value) <= MAX_LOGO_BYTES,
      `Logo must be ${MAX_LOGO_LABEL} or smaller.`,
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
