import { Suspense } from "react"

import { AffiliateOverviewLoader } from "@/components/affiliates/affiliate-overview-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export default function AffiliateHomePage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Overview"
        description="Your referral code, what you're owed, and where to go next."
        badge="Affiliate"
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <AffiliateOverviewLoader />
      </Suspense>
    </div>
  )
}
