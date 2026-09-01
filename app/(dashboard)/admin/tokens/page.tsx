import { Suspense } from "react"

import { PricingReferenceCard } from "@/components/admin/pricing-reference-card"
import { ScanGrantPanel } from "@/components/admin/scan-grant-panel"
import { TokensTabs } from "@/components/admin/tokens-tabs"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function ScanGrantSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

function PricingSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export default function AdminTokensPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Scans"
        description="Review scan pack pricing and grant scans to users."
        badge="Admin"
      />
      <Suspense>
        <TokensTabs
          pricing={
            <Suspense fallback={<PricingSkeleton />}>
              <PricingReferenceCard />
            </Suspense>
          }
          grant={
            <Suspense fallback={<ScanGrantSkeleton />}>
              <ScanGrantPanel />
            </Suspense>
          }
        />
      </Suspense>
    </div>
  )
}
