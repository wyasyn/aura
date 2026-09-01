import { Suspense } from "react"
import { TenantBanner } from "@/components/clinics/tenant-banner"
import { EntitlementProvider } from "@/components/billing/entitlement-provider"
import { ScanShell } from "@/components/layouts/scan-shell"
import { ScanTooltipProvider } from "@/components/layouts/scan-tooltip-provider"
import { AuthShellGate, getResolvedAuthContext } from "@/components/layouts/auth-shell-gate"
import { scheduleAiScanContextWarmup } from "@/lib/ai/context/warm"
import { getScanEntitlement } from "@/lib/scans/entitlement"
import type { ReactNode } from "react"

export async function ScanAuthShell({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <AuthShellGate>
      <ScanAuthShellInner>{children}</ScanAuthShellInner>
    </AuthShellGate>
  )
}

async function ScanAuthShellInner({
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

  return (
    <EntitlementProvider value={entitlement}>
      {/* The scan page is where a clinic-attributed record is actually
          created, and it sits outside the dashboard shell — so the banner is
          repeated here rather than inherited. Under cookie pinning the
          address bar still reads the platform host, so this is the only
          thing on screen that says which clinic the scan will belong to. */}
      <Suspense fallback={null}>
        <TenantBanner userId={ctx.userId} />
      </Suspense>
      <ScanTooltipProvider>
        <ScanShell>{children}</ScanShell>
      </ScanTooltipProvider>
    </EntitlementProvider>
  )
}
