import { AffiliateDashboard } from "@/components/affiliates/affiliate-dashboard"
import { requireAffiliate } from "@/lib/auth/session"
import {
  getAffiliateDashboardData,
  getAffiliateSettings,
} from "@/lib/affiliates/queries"

export async function AffiliateDashboardLoader() {
  const session = await requireAffiliate()
  const [data, settings] = await Promise.all([
    getAffiliateDashboardData(session.user.id),
    getAffiliateSettings(),
  ])

  if (!data) {
    return (
      <div className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        Affiliate profile not found.
      </div>
    )
  }

  return (
    <AffiliateDashboard
      couponCode={data.profile.couponCode}
      customerDiscountPercent={settings.customerDiscountBps / 100}
      earnedCents={data.earnedCents}
      paidCents={data.paidCents}
      owedCents={data.owedCents}
      orders={data.profile.orders}
      payouts={data.profile.payouts}
    />
  )
}
