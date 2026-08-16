"use client"

import type { ReactNode } from "react"

import { ScanStepProgress } from "@/components/scan/scan-step-progress"
import type { ScanWizardStep } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ScanStepShellProps = {
  title: string
  description?: string
  headerActions?: ReactNode
  /** Renders the wizard progress rail under the title when provided. */
  step?: ScanWizardStep
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function ScanStepShell({
  title,
  description,
  headerActions,
  step,
  children,
  className,
  contentClassName,
}: ScanStepShellProps) {
  return (
    <div
      className={cn(
        "scan-surface scan-halo relative w-full max-w-2xl rounded-[2rem] border border-border/70 p-2.5 backdrop-blur-xl sm:p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-2 pb-3 pt-2 sm:px-2.5">
        <div className="min-w-0 space-y-2">
          <div className="space-y-1">
            <h2 className="font-heading text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-base">
              {title}
            </h2>
            {description ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {step ? <ScanStepProgress current={step} className="pt-0.5" /> : null}
        </div>
        {headerActions ? (
          <div className="shrink-0 pt-0.5">{headerActions}</div>
        ) : null}
      </div>
      <div className={cn("space-y-3", contentClassName)}>{children}</div>
    </div>
  )
}
