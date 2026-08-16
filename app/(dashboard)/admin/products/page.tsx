import { Suspense } from "react"

import { ProductsAdminLoader } from "@/components/admin/products-admin-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function ProductsAdminSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border/60 p-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminProductsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Products"
        description="Manage the Aurora product catalog and recommendation matching fields."
        badge="Admin"
      />
      <Suspense fallback={<ProductsAdminSkeleton />}>
        <ProductsAdminLoader />
      </Suspense>
    </div>
  )
}
