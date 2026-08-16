/**
 * Identity and versioning for the published legal documents.
 *
 * NOTE FOR MAINTAINERS: both documents are drafted against what the code
 * actually does, and every factual claim in them is checkable against a file in
 * this repo. They are not a substitute for review by a qualified lawyer in each
 * market you operate in, and the placeholders below must be filled in with the
 * real registered entity before launch.
 */
export const LEGAL = {
  /** TODO: replace with the registered legal entity name before launch. */
  entity: "Aurora Organics",
  tradingName: "Aurora Organics",
  /** TODO: replace with the registered postal address before launch. */
  postalAddress: "Kampala, Uganda",
  contactEmail: "info@auroraorganics.co",
  privacyEmail: "info@auroraorganics.co",
  /** TODO: confirm with counsel. Should match the entity's jurisdiction. */
  governingLaw: "the laws of Uganda",
  venue: "the courts of Kampala, Uganda",
  minimumAge: 16,
} as const

export const PRIVACY_POLICY = {
  version: "2.0",
  updated: "29 July 2026",
} as const

export const TERMS_OF_USE = {
  version: "2.0",
  updated: "29 July 2026",
} as const

/**
 * Third parties that process personal data on our behalf.
 *
 * Kept in code so the published list and the integrations can be reviewed
 * together. Adding an integration means adding a row here.
 */
export const SUB_PROCESSORS = [
  {
    name: "Google (Gemini API)",
    purpose:
      "Analyses scan photos and generates cosmetic guidance and chat replies.",
    data: "Scan and chat photos, wellness profile, climate context, message text",
    region: "United States and other Google regions",
  },
  {
    name: "Vercel",
    purpose: "Hosts the application and serves it worldwide.",
    data: "Request metadata, IP address",
    region: "United States and global edge network",
  },
  {
    name: "Neon",
    purpose: "Hosts the PostgreSQL database.",
    data: "All stored account, profile, scan and chat data",
    region: "Configured database region",
  },
  {
    name: "Resend",
    purpose: "Delivers sign-in codes and account emails.",
    data: "Email address, one-time codes",
    region: "United States",
  },
  {
    name: "Vercel Analytics",
    purpose: "Aggregate page usage measurement. Only with your consent.",
    data: "Page path, referrer, coarse device and country signals",
    region: "United States",
  },
  {
    name: "Google and Apple sign-in",
    purpose: "Optional federated sign-in, only if you choose it.",
    data: "Email, name, profile image",
    region: "United States",
  },
  {
    name: "OpenStreetMap Nominatim",
    purpose: "Turns coordinates into a city name when you share a location.",
    data: "Approximate coordinates",
    region: "European Union",
  },
  {
    name: "Open-Meteo",
    purpose: "Supplies weather data for climate-aware guidance.",
    data: "Approximate coordinates",
    region: "European Union",
  },
] as const
