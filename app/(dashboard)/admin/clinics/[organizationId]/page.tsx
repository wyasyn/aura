import { Suspense } from "react"

import { ClinicDetailLoader } from "@/components/admin/clinic-detail-loader"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * The organizationId in the URL names which clinic to inspect. It does not
 * grant the right to inspect it — the loader authorizes as an administrator
 * before the id is used for anything.
 */
export default async function AdminClinicDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <ClinicDetailLoader organizationId={organizationId} />
    </Suspense>
  )
}
