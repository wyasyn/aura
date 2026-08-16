import { Skeleton } from "@/components/ui/skeleton"
import { StatCardsSkeleton } from "@/components/dashboard/skeletons/stat-cards-skeleton"

export function UsageStatsSkeleton() {
  return (
    <>
      <StatCardsSkeleton count={3} />
      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-48 w-full rounded-lg" />
      </div>
      <div className="surface-panel rounded-xl border border-border/60 p-5">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
