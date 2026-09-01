import { Suspense } from "react"

import { MyAppointmentsLoader } from "@/components/experts/my-appointments-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function AppointmentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Appointments"
        description="Your booked video consultations."
      />
      <Suspense fallback={<AppointmentsSkeleton />}>
        <MyAppointmentsLoader />
      </Suspense>
    </div>
  )
}
