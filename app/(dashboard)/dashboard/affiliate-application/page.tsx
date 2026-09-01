import { Suspense } from "react"

import { AffiliateApplicationLoader } from "@/components/affiliates/affiliate-application-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function AffiliateApplicationSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export default function AffiliateApplicationPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Become an affiliate"
        description="Apply to earn commission promoting Aurora Organics products with your own referral code."
      />
      <Suspense fallback={<AffiliateApplicationSkeleton />}>
        <AffiliateApplicationLoader />
      </Suspense>
    </div>
  )
}
