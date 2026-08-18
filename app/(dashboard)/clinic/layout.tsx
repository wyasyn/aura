import { Suspense } from "react"

import { ClinicAuthGate } from "@/components/layouts/clinic-auth-gate"
import { DashboardPageSkeleton } from "@/components/dashboard/skeletons/dashboard-page-skeleton"

export default function ClinicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <ClinicAuthGate>{children}</ClinicAuthGate>
    </Suspense>
  )
}
