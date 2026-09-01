import { Suspense } from "react"

import { ValidationQueueLoader } from "@/components/training/validation-queue-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ExpertValidationPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Validate assessments"
        description="Review de-identified assessments before they are used to improve the model."
        badge="Expert"
      />
      <p className="text-muted-foreground max-w-2xl text-sm">
        Each card shows what the model concluded and the context it had. Nothing
        here identifies a patient, and no photographs are kept. Marking an
        assessment unusable keeps it out of training entirely.
      </p>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ValidationQueueLoader />
      </Suspense>
    </div>
  )
}
