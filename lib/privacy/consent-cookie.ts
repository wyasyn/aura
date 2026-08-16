export const ANALYTICS_CONSENT_COOKIE = "aurora-analytics-consent"

/** Bump to re-ask everyone, for example when a new processor is added. */
export const ANALYTICS_CONSENT_VERSION = "1"

export type AnalyticsConsent = "granted" | "denied" | null

/** Cookie value format: `<version>:<granted|denied>`. */
export function parseAnalyticsConsent(
  value: string | undefined | null,
): AnalyticsConsent {
  if (!value) return null
  const [version, decision] = value.split(":")
  if (version !== ANALYTICS_CONSENT_VERSION) return null
  return decision === "granted" || decision === "denied" ? decision : null
}

export function serializeAnalyticsConsent(decision: "granted" | "denied"): string {
  return `${ANALYTICS_CONSENT_VERSION}:${decision}`
}

export const ANALYTICS_CONSENT_MAX_AGE = 60 * 60 * 24 * 365
