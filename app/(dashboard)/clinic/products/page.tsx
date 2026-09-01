import { Suspense } from "react"

import { ClinicProductsLoader } from "@/components/clinics/clinic-products-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicProductsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Products"
        description="Your own catalogue, alongside the Aurora products your patients can be recommended."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ClinicProductsLoader />
      </Suspense>
    </div>
  )
}
