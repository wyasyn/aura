import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getClinicAnalytics } from "@/lib/clinics/analytics"
import { requireClinicMember } from "@/lib/clinics/membership"

function formatBand(band: string): string {
  return band.replace(/_/g, " ")
}

export async function ClinicAnalyticsLoader() {
  const session = await requireClinicMember()
  const analytics = await getClinicAnalytics(session.scope)

  const peak = Math.max(1, ...analytics.dailyVolume.map((day) => day.count))
  const bandTotal = analytics.bandBreakdown.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Scans, last 30 days" value={analytics.scansLast30Days} />
        <StatCard
          label="vs previous 30 days"
          value={
            analytics.trendPercent === null
              ? "—"
              : `${analytics.trendPercent > 0 ? "+" : ""}${analytics.trendPercent}%`
          }
          hint={
            analytics.trendPercent === null
              ? "No earlier activity to compare"
              : `${analytics.scansPrevious30Days} previously`
          }
        />
        <StatCard label="Unique patients" value={analytics.uniquePatients} />
        <StatCard label="Scans all time" value={analytics.totalScans} />
      </div>

      <div className="surface-panel space-y-4 rounded-xl border border-border/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">Daily scan volume</p>
          <Button asChild size="sm" variant="outline">
            <a href="/api/clinic/scans.csv">Export CSV</a>
          </Button>
        </div>

        {analytics.scansLast30Days === 0 ? (
          <p className="text-muted-foreground text-sm">
            No scans in the last 30 days.
          </p>
        ) : (
          <div
            className="flex h-32 items-end gap-[2px]"
            role="img"
            aria-label={`Daily scan volume over the last 30 days, peaking at ${peak} scans`}
          >
            {analytics.dailyVolume.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count}`}
                className="bg-primary/70 min-h-[2px] flex-1 rounded-t-sm"
                style={{ height: `${(day.count / peak) * 100}%` }}
              />
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          Last 30 days, UTC. Peak {peak} scan{peak === 1 ? "" : "s"} in a day.
        </p>
      </div>

      <div className="surface-panel space-y-3 rounded-xl border border-border/60 p-5">
        <p className="font-medium">Assessment bands</p>
        {analytics.bandBreakdown.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No completed assessments yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {analytics.bandBreakdown.map((row) => (
              <li key={row.band} className="flex items-center gap-3">
                <Badge variant="outline" className="min-w-28 justify-start">
                  {formatBand(row.band)}
                </Badge>
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${(row.count / bandTotal) * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-12 text-right text-sm tabular-nums">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
