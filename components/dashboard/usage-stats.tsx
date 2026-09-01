import { RecentActivityList } from "@/components/dashboard/recent-activity-list"
import { UsageBarChart } from "@/components/dashboard/usage-chart"
import { UsageScanSummary } from "@/components/dashboard/usage-scan-summary"
import { StatCard } from "@/components/dashboard/page-header"
import { CompactNumber } from "@/components/ui/compact-number"
import { Progress } from "@/components/ui/progress"
import { requireAuthContext } from "@/lib/auth/context"
import { getUserDashboardStats } from "@/lib/dashboard/stats"

export async function UsageStats() {
  const ctx = await requireAuthContext()
  const stats = await getUserDashboardStats(ctx.userId)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Remaining" value={stats.remaining} />
        <StatCard
          label="Used"
          value={stats.periodUsed}
          hint="On your current plan"
        />
        <StatCard
          label="Granted"
          value={stats.periodGranted}
          hint={`${stats.lifetimeUsed} used all time`}
        />
        <StatCard
          label="Chats used"
          value={stats.chatMessagesUsed}
          hint={
            <>
              <CompactNumber value={stats.chatMessagesRemaining} /> remaining
            </>
          }
        />
      </div>

      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <UsageScanSummary
            used={stats.periodUsed}
            granted={stats.periodGranted}
            remaining={stats.remaining}
          />
        </div>
        <Progress
          value={Math.min(
            100,
            (stats.periodUsed / Math.max(stats.periodGranted, 1)) * 100,
          )}
          className="mt-4 h-2"
        />
      </div>

      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <h2 className="font-heading text-sm font-medium">Daily scans used</h2>
        <div className="mt-4">
          <UsageBarChart data={stats.dailyUsage} />
        </div>
      </div>

      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <h2 className="font-heading text-sm font-medium">Recent activity</h2>
        <div className="mt-4">
          <RecentActivityList entries={stats.recentActivity} />
        </div>
      </div>
    </>
  )
}
