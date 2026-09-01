import { Suspense } from "react"

import { ClinicPatientsLoader } from "@/components/clinics/clinic-patients-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicPatientsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Patients"
        description="Scans taken through your clinic's site."
        badge="Clinic"
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <ClinicPatientsLoader />
      </Suspense>
    </div>
  )
}
