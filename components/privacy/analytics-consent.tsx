"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Analytics } from "@vercel/analytics/next"

import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/ease"
import {
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_MAX_AGE,
  serializeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/privacy/consent-cookie"

/**
 * Gates Vercel Analytics behind an explicit choice.
 *
 * Analytics previously loaded on every route unconditionally while the privacy
 * policy stated we used none. Cookieless or not, it is a processor and it is
 * disclosed and consented to now rather than assumed.
 */
export function AnalyticsConsentGate({
  initialConsent,
}: {
  initialConsent: AnalyticsConsent
}) {
  const [consent, setConsent] = useState<AnalyticsConsent>(initialConsent)
  const reduceMotion = useReducedMotion()

  function decide(decision: "granted" | "denied") {
    document.cookie = [
      `${ANALYTICS_CONSENT_COOKIE}=${serializeAnalyticsConsent(decision)}`,
      "Path=/",
      `Max-Age=${ANALYTICS_CONSENT_MAX_AGE}`,
      "SameSite=Lax",
      window.location.protocol === "https:" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ")

    setConsent(decision)
  }

  return (
    <>
      {consent === "granted" ? <Analytics /> : null}

      <AnimatePresence>
        {consent === null ? (
          <motion.div
            role="dialog"
            aria-label="Analytics consent"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="surface-panel border-border/70 mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl border p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                We would like to measure which pages get used, using Vercel
                Analytics. It does not set advertising cookies and never sees
                your scans.{" "}
                <Link
                  href="/privacy"
                  className="text-foreground underline underline-offset-4"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-full px-5 sm:flex-none"
                  onClick={() => decide("denied")}
                >
                  No thanks
                </Button>
                <Button
                  type="button"
                  className="h-10 flex-1 rounded-full px-5 sm:flex-none"
                  onClick={() => decide("granted")}
                >
                  Allow
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
