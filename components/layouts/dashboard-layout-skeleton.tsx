import { Skeleton } from "@/components/ui/skeleton"

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex h-svh overflow-hidden">
      <div className="hidden w-64 shrink-0 border-r border-border bg-sidebar p-4 md:block">
        <Skeleton className="h-6 w-16" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
