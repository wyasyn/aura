import { AdminUsageDashboard } from "@/components/admin/admin-usage-dashboard"
import {
  getAdminUsageAnalytics,
  type UsagePeriod,
  type UsageSource,
} from "@/lib/admin/usage-analytics"

type AdminUsageLoaderProps = {
  period?: UsagePeriod
  modelId?: string
  source?: UsageSource
}

export async function AdminUsageLoader({
  period,
  modelId,
  source,
}: AdminUsageLoaderProps) {
  const analytics = await getAdminUsageAnalytics({
    period,
    modelId: modelId && modelId !== "all" ? modelId : undefined,
    source,
  })

  return <AdminUsageDashboard analytics={analytics} />
}
