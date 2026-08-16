"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function ScanSegmentGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-0 rounded-lg border border-border bg-card p-0.5",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ScanSegmentButton({
  children,
  active = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
