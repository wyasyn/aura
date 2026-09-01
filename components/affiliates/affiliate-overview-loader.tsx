import Link from "next/link"
import { IconArrowRight, IconCoin, IconPackage } from "@tabler/icons-react"

import { CopyCouponCode } from "@/components/affiliates/copy-coupon-code"
import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireAffiliate } from "@/lib/auth/session"
import {
  getAffiliateDashboardData,
  getAffiliateSettings,
} from "@/lib/affiliates/queries"
import { monthlyEarnings } from "@/lib/affiliates/share-link"
import { prisma } from "@/lib/db/client"
import { formatMoneyCents } from "@/lib/payments/format"

const STATUS_VARIANT = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
} as const

/**
 * A landing page, not a second earnings report.
 *
 * The full ledger lives on /affiliate/earnings and the catalogue on
 * /affiliate/products; this shows the one number an affiliate opens the
 * dashboard to check, the code they need to hand out, and a way through to
 * either of the other two.
 */
export async function AffiliateOverviewLoader() {
  const session = await requireAffiliate()
  const [data, settings, productCount] = await Promise.all([
    getAffiliateDashboardData(session.user.id),
    getAffiliateSettings(),
    prisma.product.count({ where: { isActive: true, organizationId: null } }),
  ])

  if (!data) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
        Affiliate profile not found.
      </div>
    )
  }

  const months = monthlyEarnings(data.profile.orders)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const currentMonth = months.find((month) => month.month === thisMonth)
  const recent = data.profile.orders.slice(0, 5)
  const confirmedCount = data.profile.orders.filter(
    (order) => order.status === "confirmed",
  ).length

  return (
    <div className="space-y-6">
      <div className="surface-panel rounded-xl border border-border/60 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Your referral code</p>
            <p className="font-mono text-3xl font-semibold tracking-tight">
              {data.profile.couponCode ?? "Not issued yet"}
            </p>
            <p className="text-muted-foreground text-sm">
              Customers who enter it at checkout earn you{" "}
              {settings.commissionRateBps / 100}% of the order.
            </p>
          </div>
          {data.profile.couponCode ? (
            <CopyCouponCode code={data.profile.couponCode} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Owed to you"
          value={formatMoneyCents(data.owedCents)}
          hint="Earned, not yet paid out"
        />
        <StatCard
          label="This month"
          value={formatMoneyCents(currentMonth?.commissionCents ?? 0)}
          hint={`${currentMonth?.orders ?? 0} confirmed ${
            (currentMonth?.orders ?? 0) === 1 ? "order" : "orders"
          }`}
        />
        <StatCard
          label="Referred orders"
          value={confirmedCount}
          hint="Confirmed all time"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">Recent referrals</p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/affiliate/earnings">
                All earnings <IconArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {recent.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              Nothing yet. Share your code on a product link to get started.
            </p>
          ) : (
            <ul className="divide-border mt-2 divide-y">
              {recent.map((order) => (
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            href="/affiliate/products"
            className="surface-panel hover:border-primary/50 group flex items-start gap-4 rounded-xl border border-border/60 p-5 transition-colors"
          >
            <IconPackage className="text-muted-foreground group-hover:text-primary mt-0.5 size-5 shrink-0 transition-colors" />
            <div>
              <p className="font-medium">Products &amp; links</p>
              <p className="text-muted-foreground text-sm">
                {productCount} {productCount === 1 ? "product" : "products"} to
                promote, each with a share link carrying your code.
              </p>
            </div>
          </Link>

          <Link
            href="/affiliate/earnings"
            className="surface-panel hover:border-primary/50 group flex items-start gap-4 rounded-xl border border-border/60 p-5 transition-colors"
          >
            <IconCoin className="text-muted-foreground group-hover:text-primary mt-0.5 size-5 shrink-0 transition-colors" />
            <div>
              <p className="font-medium">Earnings</p>
              <p className="text-muted-foreground text-sm">
                Month-by-month commission, every referred order, and your payout
                history.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
