import { Suspense } from "react"

import { ClinicDomainLoader } from "@/components/clinics/clinic-domain-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicDomainPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Domain"
        description="Serve your clinic on a domain you own."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ClinicDomainLoader />
      </Suspense>
    </div>
  )
}
