import { Skeleton } from "@/components/ui/skeleton"

export function ReportsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface-panel rounded-xl border border-border/60 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
