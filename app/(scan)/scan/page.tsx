import { Suspense } from "react"

import { ScanAccessGate } from "@/components/scan/scan-access-gate"
import { ScanWizard } from "@/components/scan/scan-wizard"
import { requireAuthContext } from "@/lib/auth/context"
import { getReturnHref } from "@/lib/billing/return-href"
import { getScanEntitlement } from "@/lib/scans/entitlement"

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
