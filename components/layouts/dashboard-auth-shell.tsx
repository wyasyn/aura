import type { ReactNode } from "react"

import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { EntitlementProvider } from "@/components/billing/entitlement-provider"
import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { scheduleAiScanContextWarmup } from "@/lib/ai/context/warm"
import { getScanEntitlement } from "@/lib/scans/entitlement"
import {
  AuthShellGate,
  getResolvedAuthContext,
} from "@/components/layouts/auth-shell-gate"

export async function DashboardAuthShell({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <AuthShellGate onboardingRedirect="/onboarding?callbackUrl=%2Fdashboard">
      <DashboardAuthShellInner>{children}</DashboardAuthShellInner>
    </AuthShellGate>
  )
}

async function DashboardAuthShellInner({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const ctx = await getResolvedAuthContext()
  if (!ctx) {
    return null
  }

  scheduleAiScanContextWarmup(ctx.userId)
  const entitlement = await getScanEntitlement(ctx.userId)

  const isImpersonating = Boolean(
    ctx.session.session &&
      "impersonatedBy" in ctx.session.session &&
      ctx.session.session.impersonatedBy,
  )

  return (
    <EntitlementProvider value={entitlement}>
      {isImpersonating ? <ImpersonationBanner /> : null}
      <DashboardShell
        role={ctx.role}
        userName={ctx.user.name}
        userEmail={ctx.user.email}
        userImage={ctx.user.image ?? null}
        emailVerified={ctx.user.emailVerified}
      >
        {children}
      </DashboardShell>
    </EntitlementProvider>
  )
}
