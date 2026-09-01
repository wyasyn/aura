import { Suspense } from "react"

import { AdminUsageLoader } from "@/components/admin/admin-usage-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { AdminUsageSkeleton } from "@/components/dashboard/skeletons/admin-usage-skeleton"
import type { UsagePeriod, UsageSource } from "@/lib/admin/usage-analytics"

type AdminUsagePageProps = {
  searchParams: Promise<{
    period?: UsagePeriod
    modelId?: string
    source?: UsageSource
  }>
}

export default async function AdminUsagePage({ searchParams }: AdminUsagePageProps) {
  const params = await searchParams
  const suspenseKey = `${params.period ?? "30d"}-${params.modelId ?? "all"}-${params.source ?? "all"}`

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Usage"
        description="AI token usage, provider cost, scans, and chat activity."
        badge="Admin"
      />

      <Suspense key={suspenseKey} fallback={<AdminUsageSkeleton />}>
        <AdminUsageLoader
          period={params.period}
          modelId={params.modelId}
          source={params.source}
        />
      </Suspense>
    </div>
  )
}
