import { redirect } from "next/navigation"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { OnboardingShell } from "@/components/layouts/onboarding-shell"
import { resolveAuth } from "@/lib/auth/context"
import { getOnboardingContext } from "@/lib/onboarding/context"

export async function OnboardingAuthShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const result = await resolveAuth()

  if (result.kind === "db_unavailable") {
    return <AuthUnavailable />
  }

  if (result.kind === "guest") {
    redirect("/login")
  }

  if (result.context.onboardingCompleted) {
    redirect("/dashboard")
  }

  const context = await getOnboardingContext()
  if (!context) {
    return <AuthUnavailable title="Could not load onboarding" />
  }

  return <OnboardingShell>{children}</OnboardingShell>
}
