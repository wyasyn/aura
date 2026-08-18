import { Suspense } from "react"

import { ClinicBillingLoader } from "@/components/clinics/clinic-billing-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicBillingPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Billing"
        description="Your clinic's subscription, seats, and scan allowance."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <ClinicBillingLoader />
      </Suspense>
    </div>
  )
}
