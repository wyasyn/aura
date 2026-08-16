"use client"

import { MarketingShell } from "@/components/layouts/marketing-shell"

export function MarketingLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return <MarketingShell>{children}</MarketingShell>
}
