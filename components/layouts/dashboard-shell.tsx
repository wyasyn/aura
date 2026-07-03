"use client"

import { usePathname } from "next/navigation"

import { DashboardSidebar } from "@/components/layouts/dashboard-sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh">
      <DashboardSidebar pathname={pathname} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
