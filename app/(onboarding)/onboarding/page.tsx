import { redirect } from "next/navigation"
import { Suspense } from "react"

import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
import {
  DEFAULT_POST_ONBOARDING_PATH,
  safeCallbackPath,
} from "@/lib/auth/callback-url"
import { userNeedsPassword } from "@/lib/onboarding/actions"
import { getFreeStarterScans } from "@/lib/onboarding/constants"
import { getOnboardingContext } from "@/lib/onboarding/context"
import { normalizeStoredStep } from "@/lib/onboarding/steps"

export default async function OnboardingPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ callbackUrl?: string }>
}>) {
  const { callbackUrl: rawCallbackUrl } = await searchParams

  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingPageContent callbackUrl={rawCallbackUrl} />
    </Suspense>
  )
}

async function OnboardingPageContent({
  callbackUrl: rawCallbackUrl,
}: {
  callbackUrl?: string
}) {
  const context = await getOnboardingContext()

  if (!context) {
    redirect("/login")
  }

  if (context.completed) {
    const destination = safeCallbackPath(
      rawCallbackUrl,
      DEFAULT_POST_ONBOARDING_PATH,
    )
    redirect(
      destination === "/onboarding"
        ? DEFAULT_POST_ONBOARDING_PATH
        : destination,
    )
  }

  const callbackUrl = safeCallbackPath(
    rawCallbackUrl,
    DEFAULT_POST_ONBOARDING_PATH,
  )

  // Accounts created through Google or Apple already have no credential, and
  // accounts created with a password do. Asking either group the wrong thing is
  // pure friction, so the step is branched away when it does not apply.
  const needsPassword = await userNeedsPassword(context.user.id)

  return (
    <OnboardingWizard
      initialStep={normalizeStoredStep(context.step)}
      userName={context.user.name ?? ""}
      callbackUrl={callbackUrl}
      needsPassword={needsPassword}
      freeScans={getFreeStarterScans()}
    />
  )
}
