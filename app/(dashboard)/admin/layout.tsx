import { Suspense } from "react"

import { AdminAuthGate } from "@/components/layouts/admin-auth-gate"
import { ModelHealthBanner } from "@/components/admin/model-health-banner"
import { DashboardPageSkeleton } from "@/components/dashboard/skeletons/dashboard-page-skeleton"

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AdminAuthGate>
        <Suspense fallback={null}>
          <ModelHealthBanner />
        </Suspense>
        {children}
      </AdminAuthGate>
    </Suspense>
  )
}
