import type { ComponentType, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Standard dashboard panel. Wraps the `.surface-panel` utility so every card
 * across the dashboard shares one elevation and radius, and the scan flow's
 * heavier `.scan-surface` stays reserved for the scan itself.
 */
export function DashboardCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
}) {
  const hasHeader = Boolean(title || description || action)

  return (
    <div
      className={cn(
        "surface-panel rounded-xl border border-border/60 p-5 sm:p-6",
        className
      )}
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-heading text-sm font-medium">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children ? (
        <div className={cn(hasHeader && "mt-4", contentClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Shared empty state. A new user's first dashboard view is almost entirely
 * empty states, so they carry the first impression rather than bare text.
 */
export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-6 py-10 text-center",
        className
      )}
    >
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted/60">
          <Icon className="size-5 text-muted-foreground" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
