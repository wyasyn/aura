import { Suspense } from "react"

import { DashboardAuthShell } from "@/components/layouts/dashboard-auth-shell"
import { DashboardLayoutSkeleton } from "@/components/layouts/dashboard-layout-skeleton"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <DashboardAuthShell>{children}</DashboardAuthShell>
    </Suspense>
  )
}
