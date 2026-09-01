import { Suspense } from "react"

import { AffiliateProductsLoader } from "@/components/affiliates/affiliate-products-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function AffiliateProductsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Products & links"
        description="Everything you can promote, with a share link carrying your code."
        badge="Affiliate"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AffiliateProductsLoader />
      </Suspense>
    </div>
  )
}
