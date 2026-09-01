"use client"

import { AnimatedBadge, type AnimatedBadgeSize } from "@/components/motion/animated-badge"
import { formatBand } from "@/lib/scan/format"
import {
  getBandAnimatedStatus,
  getBandChipClass,
} from "@/lib/scan/band-styles"
import type { AssessmentBand } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type BandBadgeProps = {
  band: AssessmentBand
  size?: AnimatedBadgeSize
  variant?: "chip" | "animated"
  className?: string
}

const CHIP_SIZE_CLASS: Record<AnimatedBadgeSize, string> = {
  sm: "h-5 px-1.5 text-[10px] leading-none",
  md: "h-6 px-2 text-[11px] leading-none",
}

export function BandBadge({
  band,
  size = "sm",
  variant = "chip",
  className,
}: BandBadgeProps) {
  if (variant === "chip") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border font-medium",
          CHIP_SIZE_CLASS[size],
          getBandChipClass(band),
          className,
        )}
      >
        {formatBand(band)}
      </span>
    )
  }

  return (
    <AnimatedBadge
      status={getBandAnimatedStatus(band)}
      size={size}
      className={cn("shrink-0", className)}
      contentKey={band}
    >
      {formatBand(band)}
    </AnimatedBadge>
  )
}
