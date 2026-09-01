import { Suspense } from "react"

import { ClinicAnalyticsLoader } from "@/components/clinics/clinic-analytics-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicAnalyticsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Analytics"
        description="Scan volume, assessment outcomes, and patient reach for your clinic."
        badge="Clinic"
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        }
      >
        <ClinicAnalyticsLoader />
      </Suspense>
    </div>
  )
}
