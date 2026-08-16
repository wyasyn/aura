export const DISCLAIMER_VERSION = "1.1"

export const CHAT_COSMETIC_DISCLAIMER =
  "Cosmetic guidance only — not medical advice."

export const CONSULTATION_BOOKING_URL =
  "https://calendly.com/auroraorganic4u"

export const SKIN_DISCLAIMER =
  "This report is for cosmetic and wellness guidance only. Results may vary with lighting, photo quality, and changes in your skin. It is not a medical diagnosis. For clinical concerns, seek advice from a licensed healthcare professional."

export const RECOMMENDATION_SECTIONS = {
  everydayCare: {
    title: "Everyday care",
    description:
      "Simple habits and gentle routines to support your skin between product steps.",
  },
  recommendedProducts: {
    title: "Recommended products",
    description:
      "Aurora Organics catalog picks chosen to complement your routine and skin profile.",
  },
} as const

export const REPORT_SECTION_TITLES = {
  snapshot: "Your skin snapshot",
  dosha: "Ayurvedic skin lean",
  weather: "Your local weather",
  areas: "Key skin areas",
  everydayCare: RECOMMENDATION_SECTIONS.everydayCare.title,
  products: RECOMMENDATION_SECTIONS.recommendedProducts.title,
} as const

/** Heading for stated concerns this scan's photo did not support. */
export const CONCERNS_NOT_VISIBLE_TITLE = "Concerns not visible in this scan"

export const REPORT_FORMAT_VERSION = "1.3"
