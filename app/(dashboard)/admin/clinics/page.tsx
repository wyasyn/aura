import { Suspense } from "react"

import { ClinicAdminTabs } from "@/components/admin/clinic-admin-tabs"
import { ClinicCreateLoader } from "@/components/admin/clinic-create-loader"
import { ClinicPlansLoader } from "@/components/admin/clinic-plans-loader"
import { ClinicsLoader } from "@/components/admin/clinics-loader"
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

export default function AdminClinicsPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Clinics"
        description="Provision white-label tenants, assign plans, and manage their access."
        badge="Admin"
      />
      <ClinicAdminTabs
        clinics={
          <Suspense fallback={<PanelSkeleton />}>
            <ClinicsLoader />
          </Suspense>
        }
        provision={
          <Suspense fallback={<PanelSkeleton />}>
            <ClinicCreateLoader />
          </Suspense>
        }
        plans={
          <Suspense fallback={<PanelSkeleton />}>
            <ClinicPlansLoader />
          </Suspense>
        }
      />
    </div>
  )
}
