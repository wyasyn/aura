import { Suspense } from "react"

import { AffiliateDashboardLoader } from "@/components/affiliates/affiliate-dashboard-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}

export default function AffiliateHomePage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Affiliate dashboard"
        description="Your coupon code, earnings, and payout history."
        badge="Affiliate"
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <AffiliateDashboardLoader />
      </Suspense>
    </div>
  )
}
