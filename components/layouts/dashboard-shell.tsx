"use client"

import { usePathname } from "next/navigation"

import { DashboardContent } from "@/components/layouts/dashboard-content"
import { DashboardSidebar } from "@/components/layouts/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getActiveNavItem, type AppRole } from "@/lib/dashboard/nav"

function MobileHeader({ role, brandName }: { role: AppRole; brandName: string }) {
  const pathname = usePathname()
  const activeItem = getActiveNavItem(pathname, role)

  if (activeItem) {
    const Icon = activeItem.icon
    return (
      <>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-heading truncate text-sm font-medium">
          {activeItem.label}
        </span>
      </>
    )
  }

  return <span className="font-heading text-sm font-medium">{brandName}</span>
}

export function DashboardShell({
  children,
  role,
  userName,
  userEmail,
  userImage,
  emailVerified,
  brand,
}: {
  children: React.ReactNode
  role: AppRole
  userName: string
  userEmail: string
  userImage: string | null
  emailVerified: boolean
  /** The clinic whose site this is, or undefined on the platform host. */
  brand?: { name: string; logoUrl: string | null }
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider className="h-svh overflow-hidden">
      <DashboardSidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        emailVerified={emailVerified}
        brand={brand}
      />
      <SidebarInset className="min-h-0 overflow-y-auto">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-sm md:hidden">
          <SidebarTrigger />
          <MobileHeader role={role} brandName={brand?.name ?? "Aurora Organics"} />
        </header>
        <DashboardContent>{children}</DashboardContent>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  )
}
