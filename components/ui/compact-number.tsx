"use client"

import {
  getCompactNumberDisplay,
  shouldCompactNumber,
} from "@/lib/format/compact-number"
import { cn } from "@/lib/utils"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type CompactNumberProps = {
  value: number
  className?: string
  exactLabel?: string
}

export function CompactNumber({
  value,
  className,
  exactLabel,
}: CompactNumberProps) {
  const { compact, exact, showTooltip } = getCompactNumberDisplay(value)
  const tooltipLabel = exactLabel ?? exact

  if (!shouldCompactNumber(value) || !showTooltip) {
    return (
      <span className={cn("tabular-nums", className)}>{exact}</span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("cursor-default tabular-nums", className)}
          tabIndex={0}
        >
          {compact}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltipLabel}
      </TooltipContent>
    </Tooltip>
  )
}
