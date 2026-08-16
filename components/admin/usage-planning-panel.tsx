import { StatCard } from "@/components/dashboard/page-header"
import { UsageBarChart } from "@/components/dashboard/usage-chart"
import {
  formatDaysOrDash,
  formatMicrosAsDollars,
  formatMicrosOrDash,
  formatTokensOrDash,
} from "@/lib/admin/format-economics"
import type { AdminEconomics } from "@/lib/admin/unit-economics"

export function UsagePlanningPanel({
  economics,
  costPerScanSeries,
}: {
  economics: AdminEconomics
  costPerScanSeries: { label: string; value: number }[]
}) {
  const { planning } = economics

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-medium">Planning</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Forward-looking spend and the cost already sold but not yet incurred.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Projected ${planning.projectionDays}-day cost`}
          value={formatMicrosOrDash(planning.projectedCostMicros)}
          hint={
            planning.elapsedDays === null
              ? "No usage to project from"
              : `Run rate over ${formatDaysOrDash(planning.elapsedDays)} days of data`
          }
        />
        <StatCard
          label="Cost per day"
          value={formatMicrosOrDash(planning.dailyCostMicros)}
          hint="Average provider spend per day in this window"
        />
        <StatCard
          label="Unredeemed credits"
          value={planning.unredeemedScans}
          hint={`${formatTokensOrDash(planning.unredeemedChatTokens)} chat tokens outstanding`}
        />
        <StatCard
          label="Estimated liability"
          value={formatMicrosOrDash(planning.estimatedLiabilityMicros)}
          hint="Unredeemed credits at the loaded cost per scan"
        />
      </div>

      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <h3 className="font-heading text-sm font-medium">
          Cost per scan over time (USD)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Shows whether unit cost is drifting as model assignments and prompt
          sizes change. Buckets with no scans read as zero.
        </p>
        <div className="mt-4">
          <UsageBarChart data={costPerScanSeries} label="USD / scan" />
        </div>
      </div>
    </section>
  )
}

export function UsageOpsPanel({ economics }: { economics: AdminEconomics }) {
  const { ops } = economics
  const coverageIsLow =
    ops.costCoveragePercent !== null && ops.costCoveragePercent < 95

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        label="Failed scan cost"
        value={formatMicrosAsDollars(ops.failedScanCostMicros)}
        hint={`${ops.failedScanCount.toLocaleString()} failed or cancelled scans still billed`}
      />
      <StatCard
        label="Cost coverage"
        value={
          ops.costCoveragePercent === null
            ? "—"
            : `${ops.costCoveragePercent.toFixed(1)}%`
        }
        className={coverageIsLow ? "border-destructive/50" : undefined}
        hint={
          coverageIsLow
            ? `${ops.unpricedCalls.toLocaleString()} calls have no active model rate, so every cost above is understated`
            : "Share of calls priced by an active model rate"
        }
      />
    </div>
  )
}
