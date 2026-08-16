import { Suspense } from "react"

import { DashboardOverviewStats } from "@/components/dashboard/dashboard-overview-stats"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { DashboardScanCta } from "@/components/dashboard/dashboard-scan-cta"
import { DashboardStatsSkeleton } from "@/components/dashboard/skeletons/dashboard-stats-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Overview"
        description="Your scan allowance, recent activity, and skin reports in one place."
      />

      <Suspense fallback={<Skeleton className="h-36 w-full rounded-2xl" />}>
        <DashboardScanCta />
      </Suspense>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardOverviewStats />
      </Suspense>
    </div>
  )
}
