"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconCheck, IconSelector } from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { setWorkspaceAction } from "@/lib/dashboard/workspace-actions"
import type { WorkspaceId } from "@/lib/dashboard/nav"

export type WorkspaceOption = {
  id: WorkspaceId
  label: string
  description: string
  home: string
}

/**
 * Switches between the personas a user actually holds.
 *
 * Only workspaces the server said are available are ever rendered, and picking
 * one changes navigation only — every route and action keeps its own
 * authorization check.
 */
export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[]
  activeId: WorkspaceId
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0]

  // One workspace means there is nothing to switch between, and a control that
  // never does anything is worse than no control.
  if (workspaces.length < 2 || !active) return null

  function choose(workspace: WorkspaceOption) {
    if (workspace.id === activeId) return
    startTransition(async () => {
      await setWorkspaceAction({ workspaceId: workspace.id })
      if (isMobile) setOpenMobile(false)
      router.push(workspace.home)
      router.refresh()
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="sm"
              disabled={pending}
              tooltip={collapsed ? active.label : undefined}
              className="text-sidebar-foreground/80 justify-between"
            >
              <span className="truncate text-xs tracking-wide uppercase">
                {active.label}
              </span>
              <IconSelector className="size-4 shrink-0 opacity-60" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              Switch workspace
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onSelect={() => choose(workspace)}
                className="flex-col items-start gap-0.5"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{workspace.label}</span>
                  {workspace.id === activeId ? (
                    <IconCheck className="text-primary size-4" />
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {workspace.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
