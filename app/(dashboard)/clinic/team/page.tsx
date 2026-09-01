import { Suspense } from "react"

import { ClinicTeamLoader } from "@/components/clinics/clinic-team-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicTeamPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Team"
        description="Staff who can see your clinic's patient scans."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <ClinicTeamLoader />
      </Suspense>
    </div>
  )
}
