import { Suspense } from "react"

import { AffiliateAdminTabs } from "@/components/admin/affiliate-admin-tabs"
import { AffiliateApplicationsLoader } from "@/components/admin/affiliate-applications-loader"
import { AffiliatePayoutsLoader } from "@/components/admin/affiliate-payouts-loader"
import { AffiliateSettingsLoader } from "@/components/admin/affiliate-settings-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function PanelSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export default function AdminAffiliatesPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Affiliates"
        description="Review applications, set commission and discount rates, and record payouts."
        badge="Admin"
      />
      <AffiliateAdminTabs
        applications={
          <Suspense fallback={<PanelSkeleton />}>
            <AffiliateApplicationsLoader />
          </Suspense>
        }
        settings={
          <Suspense fallback={<PanelSkeleton />}>
            <AffiliateSettingsLoader />
          </Suspense>
        }
        payouts={
          <Suspense fallback={<PanelSkeleton />}>
            <AffiliatePayoutsLoader />
          </Suspense>
        }
      />
    </div>
  )
}
