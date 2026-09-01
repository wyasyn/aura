import { Suspense } from "react"

import { ClinicApiKeysLoader } from "@/components/clinics/clinic-api-keys-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicApiPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="API"
        description="Keys for partner and third-party integrations with your clinic's data."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <ClinicApiKeysLoader />
      </Suspense>
    </div>
  )
}
