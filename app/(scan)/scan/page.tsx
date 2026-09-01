import { Suspense } from "react"
import type { Metadata } from "next"

import { tenantMetadata } from "@/lib/clinics/metadata"
import { ScanAccessGate } from "@/components/scan/scan-access-gate"
import { ScanWizard } from "@/components/scan/scan-wizard"
import { requireAuthContext } from "@/lib/auth/context"
import { getReturnHref } from "@/lib/billing/return-href"
import { getScanEntitlement } from "@/lib/scans/entitlement"

export async function generateMetadata(): Promise<Metadata> {
  return tenantMetadata("Skin scan")
}

export default async function ScanPage() {
  const ctx = await requireAuthContext()
  const entitlement = await getScanEntitlement(ctx.userId)

  if (!entitlement.canScan) {
    const returnHref = await getReturnHref()
    return <ScanAccessGate returnHref={returnHref} />
  }

  return (
    <Suspense fallback={null}>
      <ScanWizard scanTier={entitlement.tier} />
    </Suspense>
  )
}
