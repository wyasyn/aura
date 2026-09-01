import { Suspense } from "react"

import { ExpertAuthGate } from "@/components/layouts/expert-auth-gate"
import { DashboardPageSkeleton } from "@/components/dashboard/skeletons/dashboard-page-skeleton"

export default function ExpertLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <ExpertAuthGate>{children}</ExpertAuthGate>
    </Suspense>
  )
}
