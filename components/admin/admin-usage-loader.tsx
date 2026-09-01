import { requireAdmin } from "@/lib/auth/session"
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
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const analytics = await getAdminUsageAnalytics({
    period,
    modelId: modelId && modelId !== "all" ? modelId : undefined,
    source,
  })

  return <AdminUsageDashboard analytics={analytics} />
}
