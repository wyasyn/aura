import { StatCard, type StatTrend } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatMicrosAsDollars,
  formatMicrosOrDash,
  formatPercentOrDash,
} from "@/lib/admin/format-economics"
import type { AdminEconomics } from "@/lib/admin/unit-economics"

function marginTrend(
  marginPercent: number | null,
  targetPercent: number,
): StatTrend | undefined {
  if (marginPercent === null) return undefined
  return {
    direction: marginPercent >= targetPercent ? "up" : "down",
    label: `target ${targetPercent.toFixed(0)}%`,
  }
}

export function UsageMarginPanel({
  economics,
}: {
  economics: AdminEconomics
}) {
  const { revenue, tiers, unit } = economics

  return (
    <section className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-lg font-medium">Revenue and margin</h2>
          {revenue.simulated ? (
            <Badge variant="secondary" className="font-normal">
              Simulated payments
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Succeeded {revenue.currency} payments against provider spend over the
          same period.
          {revenue.simulated
            ? " The mock payment driver is active, so this revenue is not real money."
            : null}
        </p>
      </div>

      {unit.loadedApplicable ? null : (
        <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
          A model or source filter is active. Payments cannot be filtered by
          either, so margin below would compare full revenue against partial
          cost. Clear the filters to see it.
        </p>
      )}

      {unit.loadedApplicable ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Revenue"
              value={formatMicrosAsDollars(revenue.revenueMicros)}
              hint={`${revenue.paymentCount.toLocaleString()} payments, ${revenue.scansSold.toLocaleString()} scans sold`}
            />
            <StatCard
              label="Provider cost"
              value={formatMicrosAsDollars(revenue.providerCostMicros)}
              hint="Every billable call in the window"
            />
            <StatCard
              label="Gross margin"
              value={formatMicrosAsDollars(revenue.grossMarginMicros)}
              hint="Revenue less provider cost"
            />
            <StatCard
              label="Gross margin %"
              value={formatPercentOrDash(revenue.grossMarginPercent)}
              trend={marginTrend(
                revenue.grossMarginPercent,
                revenue.targetMarginPercent,
              )}
            />
          </div>

          <div className="surface-panel rounded-xl border border-border/60 p-5">
            <h3 className="font-heading text-sm font-medium">
              Contribution per scan by tier
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              What a tier charges for one scan against what serving it costs,
              including the chat that credit entitles.
            </p>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Scan calls</TableHead>
                    <TableHead className="text-right">Chat calls</TableHead>
                    <TableHead className="text-right">Cost / scan</TableHead>
                    <TableHead className="text-right">Loaded / scan</TableHead>
                    <TableHead className="text-right">Revenue / scan</TableHead>
                    <TableHead className="text-right">Contribution</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground">
                        No tier activity in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    tiers.map((row) => (
                      <TableRow key={row.tier}>
                        <TableCell className="font-medium capitalize">
                          {row.tier}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.scanCalls.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.chatCalls.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMicrosOrDash(row.costPerScanDirect)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMicrosOrDash(row.costPerScanLoaded)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMicrosOrDash(row.revenuePerScanMicros)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMicrosOrDash(row.contributionMicros)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPercentOrDash(row.marginPercent, 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
