"use client"

import { IconCheck } from "@tabler/icons-react"
import { motion, useReducedMotion } from "motion/react"

import { EASE_OUT } from "@/lib/ease"
import type { ScanWizardStep } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

const STEPS: { id: ScanWizardStep; label: string }[] = [
  { id: "capture", label: "Capture" },
  { id: "edit", label: "Adjust" },
  { id: "quality", label: "Check" },
  { id: "analyzing", label: "Analyze" },
  { id: "results", label: "Report" },
]

type ScanStepProgressProps = {
  current: ScanWizardStep
  className?: string
}

/**
 * Compact progress rail for the scan wizard. Full labels on sm+, and a
 * "Step n of 5" summary on narrow screens where the labels would wrap.
 */
export function ScanStepProgress({ current, className }: ScanStepProgressProps) {
  const reduce = useReducedMotion()
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.id === current),
  )
  const active = STEPS[activeIndex]

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label={`Scan progress: step ${activeIndex + 1} of ${STEPS.length}, ${active.label}`}
    >
      <ol className="hidden items-center gap-1.5 sm:flex">
        {STEPS.map((step, index) => {
          const done = index < activeIndex
          const isActive = index === activeIndex

          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-1 transition-colors duration-300",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : done
                      ? "border-transparent bg-transparent text-muted-foreground"
                      : "border-transparent bg-transparent text-muted-foreground/60",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold tabular-nums transition-colors duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground/70",
                  )}
                >
                  {done ? (
                    <IconCheck className="size-2.5" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-[11px] font-medium leading-none">
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-px w-3 transition-colors duration-300",
                    done ? "bg-emerald-500/40" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="flex items-center gap-2 sm:hidden">
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{
              width: `${((activeIndex + 1) / STEPS.length) * 100}%`,
            }}
            transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }}
          />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {activeIndex + 1}/{STEPS.length} · {active.label}
        </span>
      </div>
    </div>
  )
}
