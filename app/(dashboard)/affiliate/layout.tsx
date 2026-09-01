import { Suspense } from "react"

import { AffiliateAuthGate } from "@/components/layouts/affiliate-auth-gate"
import { DashboardPageSkeleton } from "@/components/dashboard/skeletons/dashboard-page-skeleton"

export default function AffiliateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AffiliateAuthGate>{children}</AffiliateAuthGate>
    </Suspense>
  )
}
