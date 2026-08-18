import { Suspense } from "react"

import { AvailabilityLoader } from "@/components/experts/availability-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function AvailabilitySkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export default function ExpertAvailabilityPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Availability"
        description="Add time slots patients can book for a paid video consultation."
        badge="Expert"
      />
      <Suspense fallback={<AvailabilitySkeleton />}>
        <AvailabilityLoader />
      </Suspense>
    </div>
  )
}
