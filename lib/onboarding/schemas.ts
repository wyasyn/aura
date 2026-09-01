import { z } from "zod"

import { SCAN_TIERS } from "@/lib/models/types"

export const consentSchema = z.object({
  photoProcessingConsent: z.boolean().refine((v) => v === true, {
    message: "You must consent to photo processing to continue.",
  }),
  marketingConsent: z.boolean().optional(),
})

export const basicsSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  biologicalSex: z
    .enum(["female", "male", "intersex", "prefer_not_to_say"])
    .optional(),
})

export const skinSchema = z.object({
  skinType: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.enum(["oily", "dry", "combination", "sensitive", "normal"]).optional(),
  ),
  fitzpatrickBand: z.preprocess(
    (value) =>
      value === "" || value === "unsure" || value === null || value === undefined
        ? undefined
        : value,
    z.enum(["I", "II", "III", "IV", "V", "VI"]).optional(),
  ),
  skinDosha: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.enum(["vata", "pitta", "kapha", "balanced"]).optional(),
  ),
  primaryConcerns: z.array(z.string()).default([]),
  skinGoals: z.array(z.string()).default([]),
  allergies: z.string().max(2000).optional(),
  expertReviewRequested: z.boolean().optional(),
})

export const routineSchema = z.object({
  currentRoutine: z.object({
    am: z.string().max(2000).optional(),
    pm: z.string().max(2000).optional(),
  }),
  previousPrescriptions: z
    .array(
      z.object({
        name: z.string().min(1),
        active: z.boolean(),
        notes: z.string().max(1000).optional(),
        startedAt: z.string().optional(),
      })
    )
    .optional(),
  medications: z
    .array(
      z.object({
        name: z.string().min(1),
        notes: z.string().max(1000).optional(),
      })
    )
    .optional(),
})

export const lifestyleSchema = z.object({
  lifestyleFactors: z.object({
    sunExposure: z.enum(["low", "moderate", "high"]),
    smoking: z.enum(["never", "former", "current"]),
    sleepHours: z.enum(["under_6", "6_to_7", "7_to_8", "over_8"]),
    waterIntake: z.enum(["low", "moderate", "high"]),
  }),
})

const optionalLocationField = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().max(120).optional(),
)

export const locationSchema = z.object({
  city: optionalLocationField,
  region: optionalLocationField,
  country: optionalLocationField,
  postalCode: z.string().max(32).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationSource: z.enum(["manual", "geocode", "browser"]).default("manual"),
})

export const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const scanGrantSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  tier: z.enum(SCAN_TIERS).optional(),
  packId: z.string().optional(),
  reason: z.string().max(500).optional(),
})

/** @deprecated Use scanGrantSchema */
export const tokenGrantSchema = scanGrantSchema
