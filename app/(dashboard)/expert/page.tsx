import { Suspense } from "react"
import Link from "next/link"

import { ExpertBookingsLoader } from "@/components/experts/expert-bookings-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function BookingsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}

export default function ExpertHomePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DashboardPageHeader
          title="Your bookings"
          description="Upcoming and past consultations."
          badge="Expert"
        />
        <Button asChild variant="outline">
          <Link href="/expert/availability">Manage availability</Link>
        </Button>
      </div>
      <Suspense fallback={<BookingsSkeleton />}>
        <ExpertBookingsLoader />
      </Suspense>
    </div>
  )
}
