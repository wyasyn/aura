import { Suspense } from "react"

import { ScanAuthShell } from "@/components/layouts/scan-auth-shell"
import { ScanPageSkeleton } from "@/components/scan/scan-page-skeleton"

export default function ScanLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<ScanPageSkeleton />}>
      <ScanAuthShell>{children}</ScanAuthShell>
    </Suspense>
  )
}
