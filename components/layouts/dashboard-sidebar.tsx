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
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/components/layouts/workspace-switcher"
import { signOut } from "@/lib/auth/client"
import {
  getNavSections,
  isNavItemActive,
  resolveActiveWorkspace,
  type AppRole,
  type WorkspaceId,
  type WorkspaceCapabilities,
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

/**
 * Attribution on a white-labelled site. Deliberately quiet and only shown to a
 * clinic's own users — on the platform host the whole product is already
 * Aurora, so repeating it would be noise. Hidden when the sidebar is collapsed
 * to icons, where there is no room for it to read as anything but clutter.
 */
function PoweredByAurora() {
  const { state } = useSidebar()
  if (state === "collapsed") return null

  return (
    <div className="flex items-center justify-center gap-1.5 border-t border-sidebar-border px-2 py-2">
      <Image
        src={brandIcon}
        alt=""
        width={14}
        height={14}
        className="size-3.5 shrink-0 object-contain opacity-60"
        style={{ width: "auto", height: "auto" }}
      />
      <span className="text-sidebar-foreground/60 text-[11px]">
        Powered by Aurora
      </span>
    </div>
  )
}

export function DashboardSidebar({
  role,
  userName,
  userEmail,
  userImage,
  emailVerified,
  brand,
  workspaces,
  activeWorkspaceId,
  capabilities,
}: {
  role: AppRole
  userName: string
  userEmail: string
  userImage: string | null
  emailVerified: boolean
  /** The clinic whose site this is, or undefined on the platform host. */
  brand?: { name: string; logoUrl: string | null }
  workspaces?: WorkspaceOption[]
  activeWorkspaceId?: WorkspaceId
  capabilities?: WorkspaceCapabilities
}) {
  const pathname = usePathname()
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"
  // Resolved here rather than passed in. Sections carry icon components, and a
  // React component is a function — passing one from a server component to a
  // client component fails at serialisation time. Only the workspace id, a
  // string, crosses the boundary. The server still decides which ids are
  // available, so this is a rendering detail, not an authorization one.
  const workspace = capabilities
    ? resolveActiveWorkspace(capabilities, activeWorkspaceId, pathname)
    : null

  const sections = workspace ? workspace.sections : getNavSections(role)
  const brandName = brand?.name ?? "Aurora Organics"

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
              tooltip={collapsed ? "Expand sidebar" : brandName}
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
                  {brand?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- an uploaded
                    // logo is an inline data URI, which next/image cannot optimise.
                    <img
                      src={brand.logoUrl}
                      alt=""
                      className="size-7 object-contain group-data-[collapsible=icon]:size-4"
                    />
                  ) : (
                    <Image
                      src={brandIcon}
                      alt=""
                      width={32}
                      height={32}
                      className="size-7 object-contain group-data-[collapsible=icon]:size-4"
                      style={{ width: "auto", height: "auto" }}
                    />
                  )}
                </span>
                <span className="font-heading truncate text-sm font-medium tracking-wide">
                  {brandName}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {workspaces && workspace ? (
        <div className="border-b border-sidebar-border px-2 py-2">
          {/* Named from the same resolution the sections use, so the switcher
              never labels the sidebar as one workspace while showing another. */}
          <WorkspaceSwitcher workspaces={workspaces} activeId={workspace.id} />
        </div>
      ) : null}

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
      {brand ? <PoweredByAurora /> : null}
      <SidebarRail />
    </Sidebar>
  )
}
