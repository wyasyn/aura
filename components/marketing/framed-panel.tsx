import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type FramedPanelProps = {
  children: ReactNode
  className?: string
  innerClassName?: string
}

export function FramedPanel({
  children,
  className,
  innerClassName,
}: FramedPanelProps) {
  return (
    <div
      className={cn(
        "border-border bg-muted/40 relative overflow-hidden rounded-2xl border p-3 shadow-sm",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden rounded-xl", innerClassName)}>
        {children}
      </div>
    </div>
  )
}
