import { requireAdmin } from "@/lib/auth/session"
import { AffiliatePayoutsTable } from "@/components/admin/affiliate-payouts-table"
import { listAffiliatesWithBalances } from "@/lib/admin/affiliate-payout-queries"

export async function AffiliatePayoutsLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const affiliates = await listAffiliatesWithBalances()
  return <AffiliatePayoutsTable affiliates={affiliates} />
}
