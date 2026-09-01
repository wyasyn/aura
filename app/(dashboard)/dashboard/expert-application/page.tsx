import { Suspense } from "react"

import { ExpertApplicationLoader } from "@/components/experts/expert-application-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function ExpertApplicationSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export default function ExpertApplicationPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Become an expert"
        description="Apply to offer paid video consultations as a dermatologist or Ayurvedic practitioner on Aurora."
      />
      <Suspense fallback={<ExpertApplicationSkeleton />}>
        <ExpertApplicationLoader />
      </Suspense>
    </div>
  )
}
