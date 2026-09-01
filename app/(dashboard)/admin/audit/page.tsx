import { Suspense } from "react"

import { AuditLogLoader } from "@/components/admin/audit-log-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; result?: string; cursor?: string }>
}) {
  const params = await searchParams

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Audit log"
        description="Who did what, in which tenant, and whether it was allowed."
        badge="Admin"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AuditLogLoader
          action={params.action ?? null}
          result={params.result ?? null}
          cursor={params.cursor ?? null}
        />
      </Suspense>
    </div>
  )
}
