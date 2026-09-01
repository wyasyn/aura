import Link from "next/link"

import { RoleDistributionChart, UsageBarChart } from "@/components/dashboard/usage-chart"
import { StatCard } from "@/components/dashboard/page-header"
import {
  formatMicrosOrDash,
  formatPercentOrDash,
} from "@/lib/admin/format-economics"
import { getAdminDashboardStats } from "@/lib/dashboard/stats"
import {
  formatExactMicroUsd,
  formatMicroUsdCompact,
  shouldCompactMicroUsd,
} from "@/lib/pricing/format-cost"
import { formatTokenBreakdown } from "@/lib/tokens/format-usage"

export async function AdminAnalytics() {
  const stats = await getAdminDashboardStats()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.userCount} />
        <StatCard label="Scans" value={stats.scanCount} />
        <StatCard label="Scans used" value={stats.scansUsed} />
        <StatCard
          label="Scans granted"
          value={stats.scansGranted}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="AI tokens (all time)"
          value={stats.aiTokens}
          hint={formatTokenBreakdown(stats.tokenBreakdown)}
        />
        <StatCard
          label="Est. provider cost"
          value={formatMicroUsdCompact(stats.estimatedCostMicros)}
          tooltip={
            shouldCompactMicroUsd(stats.estimatedCostMicros)
              ? formatExactMicroUsd(stats.estimatedCostMicros)
              : undefined
          }
          hint="Recorded scan + chat usage"
        />
        <StatCard label="Scans today" value={stats.scansToday} />
        <StatCard label="Chats today" value={stats.chatsToday} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cost per scan"
          value={formatMicrosOrDash(stats.costPerScanLoadedMicros)}
          hint="All-time provider spend per credit used"
        />
        <StatCard
          label="Gross margin"
          value={formatPercentOrDash(stats.grossMarginPercent)}
          hint={
            stats.simulatedPayments
              ? "Simulated payments less provider cost"
              : "Revenue less provider cost"
          }
        />
        <StatCard label="Active products" value={stats.productCount} />
      </div>

      <p className="text-xs text-muted-foreground">
        <Link href="/admin/usage" className="hover:text-primary hover:underline">
          Open the usage dashboard
        </Link>{" "}
        for per-scan and per-chat cost, tier margins, and spend projections.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <h2 className="font-heading text-sm font-medium">Scans granted (14 days)</h2>
          <div className="mt-4">
            <UsageBarChart data={stats.grantsByDay} label="Granted" />
          </div>
        </div>
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <h2 className="font-heading text-sm font-medium">Scans used (14 days)</h2>
          <div className="mt-4">
            <UsageBarChart data={stats.usageByDay} label="Used" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <h2 className="font-heading text-sm font-medium">AI tokens (14 days)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Scan analysis + skin advice chat
          </p>
          <div className="mt-4">
            <UsageBarChart data={stats.aiTokensByDay} label="Tokens" />
          </div>
        </div>
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <h2 className="font-heading text-sm font-medium">Provider cost (14 days)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            USD from recorded micros
          </p>
          <div className="mt-4">
            <UsageBarChart data={stats.costByDay} label="USD" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <h2 className="font-heading text-sm font-medium">Users by role</h2>
          <div className="mt-4">
            <RoleDistributionChart data={stats.usersByRole} />
          </div>
        </div>
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <h2 className="font-heading text-sm font-medium">Scans by status</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {stats.scansByStatus.map((s) => (
              <li
                key={s.status}
                className="flex justify-between border-b border-border py-2 last:border-0"
              >
                <span className="capitalize text-muted-foreground">{s.status}</span>
                <span>{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <h2 className="font-heading text-sm font-medium">Recent sign-ups</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {stats.recentUsers.map((u) => (
            <li
              key={u.id}
              className="flex justify-between gap-4 border-b border-border py-2 last:border-0"
            >
              <span>
                {u.name} — {u.email}
              </span>
              <span className="text-muted-foreground">{u.role ?? "user"}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
