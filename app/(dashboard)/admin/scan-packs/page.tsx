import { Suspense } from "react"

import { ScanPacksAdminLoader } from "@/components/admin/scan-packs-admin-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function ScanPacksAdminSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default function AdminScanPacksPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Scan packs"
        description="Manage the pricing tiers customers can buy: scan count, price, and which packs are visible for purchase."
        badge="Admin"
      />
      <Suspense fallback={<ScanPacksAdminSkeleton />}>
        <ScanPacksAdminLoader />
      </Suspense>
    </div>
  )
}
