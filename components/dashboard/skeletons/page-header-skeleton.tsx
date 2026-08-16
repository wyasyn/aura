import { Skeleton } from "@/components/ui/skeleton"

export function PageHeaderSkeleton({ withBadge = false }: { withBadge?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-48" />
        {withBadge ? <Skeleton className="h-5 w-16 rounded-lg" /> : null}
      </div>
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  )
}
