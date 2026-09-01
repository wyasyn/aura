import { Suspense } from "react"

import { UsageStats } from "@/components/dashboard/usage-stats"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { UsageStatsSkeleton } from "@/components/dashboard/skeletons/usage-stats-skeleton"

export default function UsagePage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Usage"
        description="Scan balance and usage across your saved analyses."
      />

      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStats />
      </Suspense>
    </div>
  )
}
