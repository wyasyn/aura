import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { requireAffiliate } from "@/lib/auth/session"
import { getAffiliateDashboardData, getAffiliateSettings } from "@/lib/affiliates/queries"
import { monthlyEarnings } from "@/lib/affiliates/share-link"
import { formatMoneyCents } from "@/lib/payments/format"

const STATUS_VARIANT = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
} as const

export async function AffiliateEarningsLoader() {
  const session = await requireAffiliate()
  const [data, settings] = await Promise.all([
    getAffiliateDashboardData(session.user.id),
    getAffiliateSettings(),
  ])

  if (!data) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
        Affiliate profile not found.
      </div>
    )
  }

  const months = monthlyEarnings(data.profile.orders)
  const peak = Math.max(1, ...months.map((m) => m.commissionCents))

  // Pending orders are money that may yet arrive, and are deliberately kept
  // apart from earnings so the headline figure is not inflated by orders that
  // could still be cancelled.
  const pendingCents = data.profile.orders
    .filter((order) => order.status === "pending")
    .reduce((sum, order) => sum + order.commissionAmountCents, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Owed to you" value={formatMoneyCents(data.owedCents)} />
        <StatCard label="Earned all time" value={formatMoneyCents(data.earnedCents)} />
        <StatCard label="Paid out" value={formatMoneyCents(data.paidCents)} />
        <StatCard
          label="Pending"
          value={formatMoneyCents(pendingCents)}
          hint="Orders not yet confirmed"
        />
      </div>

      <div className="surface-panel space-y-3 rounded-xl border border-border/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Monthly commission</p>
          <Badge variant="outline">
            {settings.commissionRateBps / 100}% commission
          </Badge>
        </div>

        {months.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No confirmed orders yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {months.map((month) => (
              <li key={month.month} className="flex items-center gap-3">
                <span className="text-muted-foreground w-20 shrink-0 text-sm tabular-nums">
                  {month.month}
                </span>
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${(month.commissionCents / peak) * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                  {month.orders}
                </span>
                <span className="w-20 text-right text-sm font-medium tabular-nums">
                  {formatMoneyCents(month.commissionCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <p className="font-medium">Orders</p>
          {data.profile.orders.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              No orders attributed to your code yet.
            </p>
          ) : (
            <ul className="divide-border mt-3 divide-y">
              {data.profile.orders.slice(0, 25).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {formatMoneyCents(order.orderTotalCents, order.currency)}
                      </p>
                      <Badge variant={STATUS_VARIANT[order.status]}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {order.placedAt.toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatMoneyCents(order.commissionAmountCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <p className="font-medium">Payouts</p>
          {data.profile.payouts.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              No payouts recorded yet.
            </p>
          ) : (
            <ul className="divide-border mt-3 divide-y">
              {data.profile.payouts.map((payout) => (
                <li key={payout.id} className="py-3">
                  <p className="text-sm font-medium">
                    {formatMoneyCents(payout.amountCents)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {payout.paidAt.toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                    {payout.note ? ` · ${payout.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
