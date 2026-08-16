import { cookies } from "next/headers"

import { AnalyticsConsentGate } from "@/components/privacy/analytics-consent"
import {
  ANALYTICS_CONSENT_COOKIE,
  parseAnalyticsConsent,
} from "@/lib/privacy/consent-cookie"

/**
 * Reads the consent cookie on the server.
 *
 * Kept out of the root layout and behind Suspense so reading a cookie does not
 * force every route, including the static ones, into dynamic rendering.
 */
export async function AnalyticsConsentLoader() {
  const cookieStore = await cookies()
  const consent = parseAnalyticsConsent(
    cookieStore.get(ANALYTICS_CONSENT_COOKIE)?.value,
  )

  return <AnalyticsConsentGate initialConsent={consent} />
}
