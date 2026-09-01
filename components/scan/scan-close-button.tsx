"use client"

import Link from "next/link"
import { IconLayoutDashboard, IconX } from "@tabler/icons-react"

import {
  ScanHeaderActionLink,
  scanHeaderActionClassName,
} from "@/components/scan/scan-header-action"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CAPTURE_TAB_TOOLTIPS } from "@/lib/scan/capture-copy"
import { cn } from "@/lib/utils"

type ScanDashboardLinkProps = {
  className?: string
  variant?: "icon" | "label" | "segment" | "action"
  alwaysShowLabel?: boolean
}

export function ScanDashboardLink({
  className,
  variant = "action",
  alwaysShowLabel = false,
}: ScanDashboardLinkProps) {
  if (variant === "action") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <ScanHeaderActionLink
              href="/dashboard"
              label="Dashboard"
              icon={<IconLayoutDashboard className="size-3.5" />}
              className={className}
              alwaysShowLabel={alwaysShowLabel}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {CAPTURE_TAB_TOOLTIPS.dashboard}
        </TooltipContent>
      </Tooltip>
    )
  }

  if (variant === "icon") {
    return (
      <Link
        href="/dashboard"
        aria-label="Go to dashboard"
        className={cn(
          "grid size-10 place-items-center rounded-lg border border-border bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground active:scale-95",
          className,
        )}
      >
        <IconX className="size-4" />
      </Link>
    )
  }

  if (variant === "segment") {
    return (
      <Link
        href="/dashboard"
        className={cn(
          "relative z-10 inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground",
          className,
        )}
      >
        <IconLayoutDashboard className="size-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={cn(scanHeaderActionClassName, "bg-background/80 backdrop-blur-sm", className)}
    >
      <Link href="/dashboard" aria-label="Dashboard">
        <IconLayoutDashboard className="size-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
    </Button>
  )
}

/** @deprecated Use ScanDashboardLink */
export const ScanCloseButton = ScanDashboardLink
