import { Suspense } from "react"

import { ClinicRecommendationWeightsLoader } from "@/components/clinics/clinic-recommendation-weights-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClinicRecommendationsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Recommendation intelligence"
        description="How Aurora scores products when recommending them to your patients."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ClinicRecommendationWeightsLoader />
      </Suspense>
    </div>
  )
}
