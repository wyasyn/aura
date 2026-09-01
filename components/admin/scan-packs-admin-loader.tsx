import { requireAdmin } from "@/lib/auth/session"
import { ScanPackEditor } from "@/components/admin/scan-pack-editor"
import { getPaymentCurrency } from "@/lib/payments"
import { listAllScanPacks } from "@/lib/scans/packs"

export async function ScanPacksAdminLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const packs = await listAllScanPacks()
  return <ScanPackEditor packs={packs} currency={getPaymentCurrency()} />
}
