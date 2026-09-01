import { Suspense } from "react"
import type { ReactNode } from "react"
import { cookies } from "next/headers"

import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { TenantBanner } from "@/components/clinics/tenant-banner"
import { EntitlementProvider } from "@/components/billing/entitlement-provider"
import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { scheduleAiScanContextWarmup } from "@/lib/ai/context/warm"
import { resolveTenant } from "@/lib/clinics/tenant"
import { availableWorkspaces, resolveWorkspace } from "@/lib/dashboard/nav"
import { getWorkspaceCapabilities } from "@/lib/dashboard/capabilities"
import { WORKSPACE_COOKIE } from "@/lib/dashboard/workspace-cookie"
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

  // On a clinic's subdomain the whole dashboard carries that clinic's name and
  // logo, not Aurora's — including for its patients, not just its staff.
  // Resolved on the server from the caller's real role, so an unavailable
  // workspace never reaches the browser. The switcher changes navigation only —
  // every route and action keeps its own authorization check.
  const cookieStore = await cookies()
  const capabilities = await getWorkspaceCapabilities(ctx.userId, ctx.user.role ?? null)
  const workspaces = availableWorkspaces(capabilities)
  const activeWorkspace = resolveWorkspace(
    capabilities,
    cookieStore.get(WORKSPACE_COOKIE)?.value,
  )

  const tenant = await resolveTenant()
  const brand =
    tenant.kind === "tenant"
      ? {
          name: tenant.tenant.branding.displayName,
          logoUrl: tenant.tenant.branding.logoUrl,
        }
      : undefined

  const isImpersonating = Boolean(
    ctx.session.session &&
      "impersonatedBy" in ctx.session.session &&
      ctx.session.session.impersonatedBy,
  )

  return (
    <EntitlementProvider value={entitlement}>
      {isImpersonating ? <ImpersonationBanner /> : null}
      {/* Says which clinic's site this is. Branding alone does not: it reads
          as the clinic's product rather than as a context you are inside. */}
      <Suspense fallback={null}>
        <TenantBanner userId={ctx.userId} />
      </Suspense>
      <DashboardShell
        role={ctx.role}
        userName={ctx.user.name}
        userEmail={ctx.user.email}
        userImage={ctx.user.image ?? null}
        emailVerified={ctx.user.emailVerified}
        brand={brand}
        activeWorkspaceId={activeWorkspace.id}
        capabilities={capabilities}
        workspaces={workspaces.map((w) => ({
          id: w.id,
          label: w.label,
          description: w.description,
          home: w.home,
        }))}
      >
        {children}
      </DashboardShell>
    </EntitlementProvider>
  )
}
