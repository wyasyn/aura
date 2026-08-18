import { ScanPackEditor } from "@/components/admin/scan-pack-editor"
import { getPaymentCurrency } from "@/lib/payments"
import { listAllScanPacks } from "@/lib/scans/packs"

export async function ScanPacksAdminLoader() {
  const packs = await listAllScanPacks()
  return <ScanPackEditor packs={packs} currency={getPaymentCurrency()} />
}
