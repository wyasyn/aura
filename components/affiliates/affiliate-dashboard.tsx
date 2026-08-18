import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { CopyCouponCode } from "@/components/affiliates/copy-coupon-code"
import { formatMoneyCents } from "@/lib/payments/format"
import type { AffiliateOrder, AffiliatePayout } from "@/generated/prisma/client"

const ORDER_STATUS_VARIANT = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
} as const

export function AffiliateDashboard({
  couponCode,
  customerDiscountPercent,
  earnedCents,
  paidCents,
  owedCents,
  orders,
  payouts,
}: {
  couponCode: string | null
  customerDiscountPercent: number
  earnedCents: number
  paidCents: number
  owedCents: number
  orders: AffiliateOrder[]
  payouts: AffiliatePayout[]
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total earned" value={formatMoneyCents(earnedCents)} />
        <StatCard label="Paid out" value={formatMoneyCents(paidCents)} />
        <StatCard label="Owed to you" value={formatMoneyCents(owedCents)} />
      </div>

      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Your coupon code
        </p>
        {couponCode ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-md border border-border/60 bg-muted px-3 py-1.5 font-mono text-sm">
              {couponCode}
            </code>
            <CopyCouponCode code={couponCode} />
            <p className="text-sm text-muted-foreground">
              Gives customers {customerDiscountPercent}% off. You earn a
              commission on every order placed with it.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Your coupon code hasn't been issued yet. Check back shortly.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <p className="font-medium">Orders</p>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No orders attributed to your code yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {formatMoneyCents(order.orderTotalCents, order.currency)}
                      </p>
                      <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
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
          <p className="font-medium">Payout history</p>
          {payouts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No payouts recorded yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {payouts.map((payout) => (
                <li
                  key={payout.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatMoneyCents(payout.amountCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payout.paidAt.toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                      {payout.note ? ` · ${payout.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
