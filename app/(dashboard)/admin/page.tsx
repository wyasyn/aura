import { Suspense } from "react"

import { AdminAnalytics } from "@/components/dashboard/admin-analytics"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { DashboardStatsSkeleton } from "@/components/dashboard/skeletons/dashboard-stats-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

function AdminAnalyticsSkeleton() {
  return (
    <>
      <DashboardStatsSkeleton />
      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <Skeleton className="h-4 w-36" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Analytics"
        description="Platform usage, scan allowances, and AI cost at a glance."
        badge="Admin"
      />

      <Suspense fallback={<AdminAnalyticsSkeleton />}>
        <AdminAnalytics />
      </Suspense>
    </div>
  )
}
