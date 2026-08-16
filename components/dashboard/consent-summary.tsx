import Link from "next/link"

import { requireAuthContext } from "@/lib/auth/context"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import { CONSENT_VERSION } from "@/lib/onboarding/constants"
import { PRIVACY_POLICY, TERMS_OF_USE } from "@/lib/legal/constants"

/**
 * What you agreed to and when.
 *
 * consentVersion and consentAcceptedAt were stored during onboarding but never
 * read back anywhere, so nothing surfaced a stale consent or prompted for a
 * fresh one when the version moved.
 */
export async function ConsentSummary() {
  const ctx = await requireAuthContext()
  const profile = await withDbRetry(() =>
    prisma.userProfile.findUnique({
      where: { userId: ctx.userId },
      select: {
        photoProcessingConsent: true,
        marketingConsent: true,
        consentVersion: true,
        consentAcceptedAt: true,
      },
    }),
  )

  const acceptedAt = profile?.consentAcceptedAt
  const outdated =
    profile?.consentVersion != null && profile.consentVersion !== CONSENT_VERSION

  return (
    <div className="surface-panel border-border/60 space-y-4 rounded-xl border p-5">
      <div className="space-y-1">
        <h2 className="font-heading text-sm font-medium">Your consent</h2>
        <p className="text-muted-foreground text-sm">
          {acceptedAt
            ? `You accepted consent version ${profile?.consentVersion ?? "unknown"} on ${acceptedAt.toLocaleDateString()}.`
            : "No consent record on file yet."}
        </p>
      </div>

      <dl className="text-muted-foreground divide-border/50 divide-y text-sm">
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt>Photo processing</dt>
          <dd className="text-foreground font-medium">
            {profile?.photoProcessingConsent ? "Granted" : "Not granted"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt>Marketing email</dt>
          <dd className="text-foreground font-medium">
            {profile?.marketingConsent ? "Granted" : "Not granted"}
          </dd>
        </div>
      </dl>

      {outdated ? (
        <p className="bg-primary/10 text-primary rounded-lg px-3 py-2 text-sm">
          Our terms have been updated since you agreed. Please review the current
          Privacy policy and Terms below.
        </p>
      ) : null}

      <p className="text-muted-foreground text-sm">
        <Link
          href="/privacy"
          className="text-foreground underline underline-offset-4"
        >
          Privacy policy
        </Link>{" "}
        (v{PRIVACY_POLICY.version})
        {" · "}
        <Link
          href="/terms"
          className="text-foreground underline underline-offset-4"
        >
          Terms of use
        </Link>{" "}
        (v{TERMS_OF_USE.version})
      </p>
    </div>
  )
}
