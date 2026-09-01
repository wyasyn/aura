/**
 * Identity and versioning for the published legal documents.
 *
 * NOTE FOR MAINTAINERS: both documents are drafted against what the code
 * actually does, and every factual claim in them is checkable against a file in
 * this repo. They are not a substitute for review by a qualified lawyer in each
 * market you operate in, and the placeholders below must be filled in with the
 * real registered entity before launch.
 *
 * The operating company is registered in Pakistan. Payments are taken by a
 * separate foreign entity, because Stripe does not onboard merchants registered
 * in Pakistan — see `billingEntity` below. Both are named in the published
 * documents: a customer paying one company while contracting with another has
 * to be told, and a receipt that names an entity the terms never mention is the
 * kind of discrepancy that costs a chargeback dispute.
 */
export const LEGAL = {
  /** TODO: replace with the registered legal entity name before launch. */
  entity: "Aurora Organics",
  tradingName: "Aurora Organics",
  /**
   * TODO: replace with the registered postal address before launch. The city
   * must match `venue` below.
   */
  postalAddress: "Pakistan",
  /** The jurisdiction the operating company is registered in. */
  country: "Pakistan",
  contactEmail: "info@auroraorganics.co",
  privacyEmail: "info@auroraorganics.co",
  governingLaw: "the laws of Pakistan",
  /** TODO: name the registered city, e.g. "the courts of Karachi, Pakistan". */
  venue: "the courts of Pakistan",
  /**
   * The entity that appears on card statements and receipts.
   *
   * Stripe does not support merchants registered in Pakistan, so card payments
   * are taken by a foreign affiliate. TODO: replace with that entity's
   * registered name and jurisdiction before launch.
   */
  billingEntity: {
    name: "Aurora Organics",
    jurisdiction: "TODO: billing entity jurisdiction",
  },
  /**
   * Pakistan sets no statutory minimum age for online services. 16 is retained
   * because the service is open to UK and EEA users, where it is the safe
   * figure, and lowering it would weaken a protection rather than localise one.
   */
  minimumAge: 16,
} as const

export const PRIVACY_POLICY = {
  version: "2.1",
  updated: "19 August 2026",
} as const

export const TERMS_OF_USE = {
  version: "2.1",
  updated: "19 August 2026",
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
    name: "Stripe",
    purpose:
      "Takes card payments for scan packs, consultations and clinic subscriptions, and issues receipts.",
    data: "Name, email, billing address, card details, payment amounts",
    region: "United States and Ireland",
  },
  {
    name: "Daily.co",
    purpose: "Hosts the video rooms used for expert consultations.",
    data: "Audio and video during a consultation, room join metadata",
    region: "United States and global edge network",
  },
  {
    name: "WooCommerce (Aurora Organics store)",
    purpose:
      "Holds the product catalogue and, for affiliates, issues referral coupons and reports orders placed with them.",
    data: "Affiliate coupon codes, order totals and status",
    region: "Store hosting region",
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
