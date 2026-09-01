import { Suspense } from "react"

import { ExpertApplicationsLoader } from "@/components/admin/expert-applications-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function ExpertApplicationsSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

export default function AdminExpertsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Expert applications"
        description="Review and approve dermatologists and Ayurvedic practitioners applying to join the marketplace."
        badge="Admin"
      />
      <Suspense fallback={<ExpertApplicationsSkeleton />}>
        <ExpertApplicationsLoader />
      </Suspense>
    </div>
  )
}
