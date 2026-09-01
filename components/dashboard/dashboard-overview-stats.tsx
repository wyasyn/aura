import {
  IconCamera,
  IconDroplet,
  IconMessageCircle,
  IconSparkles,
} from "@tabler/icons-react"

import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { SkinTrendChart } from "@/components/dashboard/skin-trend-chart"
import { UsageBarChart } from "@/components/dashboard/usage-chart"
import { StatCard, type StatTrend } from "@/components/dashboard/page-header"
import { CompactNumber } from "@/components/ui/compact-number"
import { requireAuthContext } from "@/lib/auth/context"
import { getUserDashboardStats } from "@/lib/dashboard/stats"
import {
  getUserScanTrends,
  summarizeScanTrends,
} from "@/lib/dashboard/scan-trends"
import { cn } from "@/lib/utils"

const SKIN_TYPE_LABEL: Record<string, string> = {
  oily: "Oily",
  dry: "Dry",
  combination: "Combination",
  sensitive: "Sensitive",
  normal: "Normal",
}

function overallTrend(delta: number): StatTrend | undefined {
  if (delta > 0) return { direction: "up", label: "Improving" }
  if (delta < 0) return { direction: "down", label: "Needs care" }
  return { direction: "flat", label: "Steady" }
}

export async function DashboardOverviewStats() {
  const ctx = await requireAuthContext()
  const [stats, trendPoints] = await Promise.all([
    getUserDashboardStats(ctx.userId),
    getUserScanTrends(ctx.userId),
  ])
  const trendSummary = summarizeScanTrends(trendPoints)

  const skinType = stats.profile?.skinType
    ? (SKIN_TYPE_LABEL[String(stats.profile.skinType)] ??
      String(stats.profile.skinType))
    : "Not set"
  const primaryConcern = stats.profile?.primaryConcerns?.[0]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Scans remaining"
          value={stats.remaining}
          icon={<IconCamera />}
          hint={`${stats.lifetimeGranted} granted all time`}
        />
        <StatCard
          label="Scans used"
          value={stats.lifetimeUsed}
          icon={<IconSparkles />}
          hint="All time"
          trend={
            trendSummary.hasTrend
              ? overallTrend(trendSummary.overallDelta)
              : undefined
          }
        />
        <StatCard
          label="Chats remaining"
          value={stats.chatMessagesRemaining}
          icon={<IconMessageCircle />}
          hint="Skin advice questions left"
        />
        <StatCard
          label="Skin type"
          value={skinType}
          icon={<IconDroplet />}
          hint={primaryConcern ? `Focus: ${primaryConcern}` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard
          title="Skin journey"
          description="Overall band trend across your saved scans"
        >
          <SkinTrendChart points={trendPoints} />

          {trendSummary.hasTrend ? (
            <div className="mt-4 space-y-3">
              <TrendChipRow
                label="Improving"
                items={trendSummary.improvingDimensions}
                tone="positive"
              />
              <TrendChipRow
                label="Watch areas"
                items={trendSummary.watchDimensions}
                tone="neutral"
              />
            </div>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title="Scans used (14 days)"
          description="One scan debited per saved analysis"
        >
          <UsageBarChart data={stats.dailyUsage} />
        </DashboardCard>

        <DashboardCard title="Quick summary">
          <dl className="space-y-3 text-sm">
            <SummaryRow
              term="Location"
              detail={
                stats.location?.city
                  ? `${stats.location.city}, ${stats.location.region}`
                  : "Not set"
              }
            />
            <SummaryRow
              term="Climate zone"
              detail={stats.location?.climateZone ?? "Not set"}
            />
            <SummaryRow
              term="Primary concerns"
              detail={
                stats.profile?.primaryConcerns?.slice(0, 3).join(", ") ||
                "Not set"
              }
              detailClassName="capitalize"
            />
            <SummaryRow
              term="Scans granted"
              detail={<CompactNumber value={stats.lifetimeGranted} />}
            />
          </dl>
        </DashboardCard>
      </div>
    </>
  )
}

function TrendChipRow({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: "positive" | "neutral"
}) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            tone === "positive"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function SummaryRow({
  term,
  detail,
  detailClassName,
}: {
  term: string
  detail: React.ReactNode
  detailClassName?: string
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className={cn("text-right", detailClassName)}>{detail}</dd>
    </div>
  )
}
