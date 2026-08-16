import type { FieldErrors } from "@/lib/onboarding/client-validation"

export type ConsentState = {
  photoProcessingConsent: boolean
  marketingConsent: boolean
}

export type BasicsState = {
  name: string
  dateOfBirth: string
  biologicalSex: string
}

export type SkinTypeState = {
  skinType: string
  fitzpatrickBand: string
  skinDosha: string
}

export type SkinConcernsState = {
  primaryConcerns: string[]
  skinGoals: string[]
  /** Drives whether the free-text allergy field is shown at all. */
  hasAllergies: boolean
  allergies: string
  expertReviewRequested: boolean
}

export type RoutineState = {
  am: string
  pm: string
  prescriptions: string
  medications: string
}

export type LifestyleState = {
  sunExposure: string
  smoking: string
  sleepHours: string
  waterIntake: string
}

export type LocationState = {
  city: string
  region: string
  country: string
  postalCode: string
  latitude?: number
  longitude?: number
  locationSource: "manual" | "geocode" | "browser"
}

export type PasswordState = {
  password: string
  confirmPassword: string
}

/** Props every step component receives. */
export type StepProps = {
  errors: FieldErrors
  disabled: boolean
}

export const CONCERN_OPTIONS = [
  { value: "acne", label: "Blemishes" },
  { value: "oiliness", label: "Oiliness" },
  { value: "dryness", label: "Dryness" },
  { value: "redness", label: "Redness" },
  { value: "hyperpigmentation", label: "Uneven tone" },
  { value: "aging", label: "Fine lines" },
  { value: "sensitivity", label: "Sensitivity" },
  { value: "texture", label: "Texture and pores" },
] as const

export const GOAL_OPTIONS = [
  { value: "hydration", label: "Hydration" },
  { value: "even_tone", label: "Even tone" },
  { value: "clear_skin", label: "Clear skin" },
  { value: "barrier_support", label: "Barrier support" },
  { value: "sun_protection", label: "Sun protection" },
  { value: "gentle_routine", label: "A gentler routine" },
] as const

export const SKIN_TYPE_OPTIONS = [
  { value: "oily", label: "Oily", hint: "Shine returns through the day" },
  { value: "dry", label: "Dry", hint: "Often tight or flaky" },
  { value: "combination", label: "Combination", hint: "Oily T-zone, drier cheeks" },
  { value: "sensitive", label: "Sensitive", hint: "Reacts easily to products" },
  { value: "normal", label: "Balanced", hint: "Rarely oily or tight" },
] as const

export const LIFESTYLE_QUESTIONS = [
  {
    field: "sunExposure" as const,
    label: "Time in direct sun",
    options: [
      { value: "low", label: "Rarely" },
      { value: "moderate", label: "Some days" },
      { value: "high", label: "Most days" },
    ],
  },
  {
    field: "smoking" as const,
    label: "Smoking",
    options: [
      { value: "never", label: "Never" },
      { value: "former", label: "Used to" },
      { value: "current", label: "Currently" },
    ],
  },
  {
    field: "sleepHours" as const,
    label: "Sleep most nights",
    options: [
      { value: "under_6", label: "Under 6h" },
      { value: "6_to_7", label: "6 to 7h" },
      { value: "7_to_8", label: "7 to 8h" },
      { value: "over_8", label: "Over 8h" },
    ],
  },
  {
    field: "waterIntake" as const,
    label: "Water intake",
    options: [
      { value: "low", label: "Low" },
      { value: "moderate", label: "Moderate" },
      { value: "high", label: "High" },
    ],
  },
] as const
