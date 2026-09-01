import { Suspense } from "react"

import { AffiliateEarningsLoader } from "@/components/affiliates/affiliate-earnings-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function AffiliateEarningsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Earnings"
        description="What you've earned, what's been paid, and what's still owed."
        badge="Affiliate"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AffiliateEarningsLoader />
      </Suspense>
    </div>
  )
}
