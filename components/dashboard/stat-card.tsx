"use client"

import type { ReactNode } from "react"
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from "@tabler/icons-react"
import { motion, useReducedMotion } from "motion/react"

import { CompactNumber } from "@/components/ui/compact-number"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

export type StatTrend = {
  direction: "up" | "down" | "flat"
  label: string
}

const TREND_ICON = {
  up: IconArrowUpRight,
  down: IconArrowDownRight,
  flat: IconMinus,
} as const

export function StatCard({
  label,
  value,
  hint,
  tooltip,
  icon,
  trend,
  className,
}: {
  label: string
  value: string | number
  hint?: ReactNode
  tooltip?: string
  /**
   * A rendered icon element, not a component reference. Server components
   * render StatCard, and function references cannot cross that boundary.
   */
  icon?: ReactNode
  trend?: StatTrend
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  const valueNode =
    typeof value === "number" ? (
      <CompactNumber value={value} />
    ) : tooltip && tooltip !== value ? (
      <TooltipValue display={value} tooltip={tooltip} />
    ) : (
      value
    )

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn(
        "surface-panel rounded-xl border border-border/60 p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className="text-muted-foreground/60 [&>svg]:size-4 [&>svg]:shrink-0"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-2 font-heading text-3xl font-medium tabular-nums">
        {valueNode}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {trend ? <TrendChip trend={trend} /> : null}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </motion.div>
  )
}

function TrendChip({ trend }: { trend: StatTrend }) {
  const Icon = TREND_ICON[trend.direction]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        trend.direction === "up" && "bg-primary/10 text-primary",
        trend.direction === "down" && "bg-muted text-muted-foreground",
        trend.direction === "flat" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3" />
      {trend.label}
    </span>
  )
}

function TooltipValue({
  display,
  tooltip,
}: {
  display: string
  tooltip: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default" tabIndex={0}>
          {display}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
