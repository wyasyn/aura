"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { IconCheck, IconLogout, IconSettings } from "@tabler/icons-react"

import brandIcon from "@/app/icon.png"

import {
  SidebarNavItem,
  SidebarNavLayoutGroup,
} from "@/components/layouts/dashboard-sidebar-nav-item"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { ThemeToggleMenuItem } from "@/components/theme-toggle"
import { signOut } from "@/lib/auth/client"
import {
  getNavSections,
  isNavItemActive,
  type AppRole,
} from "@/lib/dashboard/nav"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A"
  )
}

function SidebarUserFooter({
  userName,
  userEmail,
  userImage,
  emailVerified,
}: {
  userName: string
  userEmail: string
  userImage: string | null
  emailVerified: boolean
}) {
  const router = useRouter()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed"
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  function openMenu() {
    if (!isMobile) {
      setOpen(true)
    }
  }

  function closeMenu() {
    if (!isMobile) {
      setOpen(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            if (isMobile) {
              setOpenMobile(false)
            }
            router.push("/login")
            router.refresh()
          },
        },
      })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <SidebarFooter className="border-t border-sidebar-border p-2">
      <DropdownMenu open={open} onOpenChange={setOpen} modal={isMobile}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={open}
            onMouseEnter={openMenu}
            onMouseLeave={closeMenu}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              collapsed && "justify-center p-1",
            )}
          >
            <Avatar size={collapsed ? "default" : "lg"}>
              <AvatarImage src={userImage ?? undefined} alt={userName || "Member"} />
              <AvatarFallback>{initials(userName || userEmail)}</AvatarFallback>
              {emailVerified ? (
                <AvatarBadge>
                  <IconCheck className="size-2" />
                </AvatarBadge>
              ) : null}
            </Avatar>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {userName || "Member"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              </div>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={isMobile ? "top" : "right"}
          align="end"
          sideOffset={8}
          className="w-56"
          onMouseEnter={openMenu}
          onMouseLeave={closeMenu}
        >
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium text-foreground">
              {userName || "Member"}
            </p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {userEmail}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href="/settings"
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false)
                }
              }}
            >
              <IconSettings />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemeToggleMenuItem />
          <DropdownMenuItem
            variant="destructive"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            <IconLogout />
            {signingOut ? "Signing out…" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  )
}

export function DashboardSidebar({
  role,
  userName,
  userEmail,
  userImage,
  emailVerified,
}: {
  role: AppRole
  userName: string
  userEmail: string
  userImage: string | null
  emailVerified: boolean
}) {
  const pathname = usePathname()
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"
  const sections = getNavSections(role)

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={collapsed ? "Expand sidebar" : "Aurora Organics"}
            >
              <Link
                href="/dashboard"
                className="text-sidebar-foreground transition-colors hover:text-sidebar-accent-foreground"
                onClick={(event) => {
                  if (collapsed && !isMobile) {
                    event.preventDefault()
                    toggleSidebar()
                    return
                  }
                  if (isMobile) {
                    setOpenMobile(false)
                  }
                }}
              >
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <Image
                    src={brandIcon}
                    alt=""
                    width={32}
                    height={32}
                    className="size-7 object-contain group-data-[collapsible=icon]:size-4"
                    style={{ width: "auto", height: "auto" }}
                  />
                </span>
                <span className="font-heading truncate text-sm font-medium tracking-wide">
                  Aurora Organics
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavLayoutGroup>
          {sections.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      badge={item.badge}
                      isActive={isNavItemActive(pathname, item.href)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarNavLayoutGroup>
      </SidebarContent>

      <SidebarUserFooter
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        emailVerified={emailVerified}
      />
      <SidebarRail />
    </Sidebar>
  )
}
