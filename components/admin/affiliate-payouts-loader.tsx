import { AffiliatePayoutsTable } from "@/components/admin/affiliate-payouts-table"
import { listAffiliatesWithBalances } from "@/lib/admin/affiliate-payout-queries"

export async function AffiliatePayoutsLoader() {
  const affiliates = await listAffiliatesWithBalances()
  return <AffiliatePayoutsTable affiliates={affiliates} />
}
