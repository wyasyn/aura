import { AffiliateSettingsForm } from "@/components/admin/affiliate-settings-form"
import { getAffiliateSettings } from "@/lib/affiliates/queries"

export async function AffiliateSettingsLoader() {
  const settings = await getAffiliateSettings()
  return (
    <AffiliateSettingsForm
      commissionRateBps={settings.commissionRateBps}
      customerDiscountBps={settings.customerDiscountBps}
    />
  )
}
