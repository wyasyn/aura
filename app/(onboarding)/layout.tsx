import { Suspense } from "react"

import { OnboardingAuthShell } from "@/components/layouts/onboarding-auth-shell"
import { OnboardingFrame } from "@/components/onboarding/onboarding-chrome"
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton"

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // The shell is what suspends, so its fallback has to supply the frame
    // itself. Without it the skeleton renders bare against the viewport and the
    // header, width cap, and backdrop all pop in once the shell resolves.
    <Suspense
      fallback={
        <OnboardingFrame>
          <OnboardingSkeleton />
        </OnboardingFrame>
      }
    >
      <OnboardingAuthShell>{children}</OnboardingAuthShell>
    </Suspense>
  )
}
