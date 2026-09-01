import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function StatCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        count === 3 && "sm:grid-cols-3",
        count >= 4 && "lg:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-panel rounded-xl border border-border/60 p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-24" />
        </div>
      ))}
    </div>
  )
}
