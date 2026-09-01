import { Skeleton } from "@/components/ui/skeleton"
import { StatCardsSkeleton } from "@/components/dashboard/skeletons/stat-cards-skeleton"

export function DashboardStatsSkeleton() {
  return (
    <>
      <StatCardsSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-48 w-full rounded-lg" />
        </div>
        <div className="surface-panel rounded-xl border border-border/60 p-5">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
