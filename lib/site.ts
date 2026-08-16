/**
 * Shared site identity. Consumed by the root layout metadata and by
 * app/manifest.ts, so the installed app and the page metadata never drift.
 */

export const SITE_NAME = "Aurora Organics"

/** Home screen labels truncate hard, so the manifest gets the short form. */
export const SITE_SHORT_NAME = "Aurora"

export const SITE_TAGLINE = "Skin intelligence"

export const SITE_DESCRIPTION =
  "Scan your skin and get a cosmetic assessment in plain-language bands, an Ayurvedic skin lean, and Aurora Organics product matches filtered to your allergies and local climate. Three free scans, and your photo is never stored."

/**
 * Hex mirrors of the `--background` tokens in app/globals.css. The browser
 * chrome (`theme_color`, `<meta name="theme-color">`) and the PWA splash screen
 * are painted outside the document, so they cannot read CSS variables.
 * Keep in sync with app/globals.css if the background tokens change.
 */
export const THEME_COLOR_LIGHT = "#ffffff"
export const THEME_COLOR_DARK = "#0c0a09"

/** Brand orange, matching assets/brand/logo.svg. */
export const BRAND_COLOR = "#ff6900"

/**
 * Falls back to the deployment URL on Vercel, then to localhost in development,
 * so OG and canonical URLs resolve correctly in every environment.
 */
export const siteUrl =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
