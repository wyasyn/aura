import { Skeleton } from "@/components/ui/skeleton"

export function ScanPageSkeleton() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-7 w-40 rounded-lg bg-muted/50" />
          <Skeleton className="h-9 w-56 rounded-lg bg-muted/50" />
        </div>
        <div className="scan-surface w-full rounded-[2rem] border border-border/70 p-2.5 backdrop-blur-xl sm:p-3">
          <div className="space-y-2 px-2 pb-3 pt-2">
            <Skeleton className="h-4 w-36 rounded-md bg-muted/50" />
            <Skeleton className="h-3 w-56 max-w-full rounded-md bg-muted/40" />
          </div>
          <Skeleton className="h-72 w-full rounded-[1.75rem] bg-muted/40" />
        </div>
      </div>
    </div>
  )
}
