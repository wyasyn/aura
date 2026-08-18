import { Suspense } from "react"

import { ClinicBrandingLoader } from "@/components/clinics/clinic-branding-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicBrandingPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Branding"
        description="How your clinic appears to patients on your own domain."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ClinicBrandingLoader />
      </Suspense>
    </div>
  )
}
