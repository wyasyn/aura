import { requireAdmin } from "@/lib/auth/session"
import { AffiliateSettingsForm } from "@/components/admin/affiliate-settings-form"
import { getAffiliateSettings } from "@/lib/affiliates/queries"

export async function AffiliateSettingsLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const settings = await getAffiliateSettings()
  return (
    <AffiliateSettingsForm
      commissionRateBps={settings.commissionRateBps}
      customerDiscountBps={settings.customerDiscountBps}
    />
  )
}
