import { StatCardsSkeleton } from "@/components/dashboard/skeletons/stat-cards-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function BillingSummarySkeleton() {
  return <StatCardsSkeleton count={3} />
}

function PanelSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <section className="surface-panel rounded-xl border border-border/60 p-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function PackCatalogSkeleton() {
  return (
    <PanelSkeleton>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </PanelSkeleton>
  )
}

export function BillingDetailsSkeleton() {
  return (
    <PanelSkeleton>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </PanelSkeleton>
  )
}

export function PaymentHistorySkeleton() {
  return (
    <PanelSkeleton>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </PanelSkeleton>
  )
}
