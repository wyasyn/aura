import { Suspense } from "react"

import { TrainingPanelLoader } from "@/components/admin/training-panel-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminTrainingPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Training data"
        description="Consented, de-identified, expert-validated examples for improving the model."
        badge="Admin"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <TrainingPanelLoader />
      </Suspense>
    </div>
  )
}
