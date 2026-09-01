"use client"

import type { ReactNode } from "react"

import { AnimatedBadge } from "@/components/motion/animated-badge"
import { cn } from "@/lib/utils"

type ScanImagePanelProps = {
  imageSrc?: string | null
  isLoading?: boolean
  loadingLabel?: string
  overlay?: ReactNode
  /** Constrain width for report layout; image keeps natural aspect height */
  compact?: boolean
  className?: string
}

export function ScanImagePanel({
  imageSrc,
  isLoading = false,
  loadingLabel = "Analyzing",
  overlay,
  compact = false,
  className,
}: ScanImagePanelProps) {
  if (!imageSrc && !isLoading) {
    return null
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border border-border",
        className,
      )}
    >
      {imageSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageSrc}
          alt="Scan photo"
          className={cn(
            "block w-full object-cover",
            compact ? "h-auto" : "aspect-[3/4]",
          )}
        />
      ) : (
        <div
          className={cn(
            "block w-full bg-muted",
            compact ? "h-auto min-h-48" : "aspect-[3/4]",
          )}
          aria-hidden
        />
      )}

      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px]">
          <AnimatedBadge status="loading" size="md" aria-live="polite">
            {loadingLabel}
          </AnimatedBadge>
          {overlay}
        </div>
      ) : null}
    </div>
  )
}
