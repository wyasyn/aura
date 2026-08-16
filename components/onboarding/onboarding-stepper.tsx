"use client"

import { IconCheck } from "@tabler/icons-react"
import { motion, useReducedMotion } from "motion/react"

import {
  ONBOARDING_STEP_LABELS,
  type OnboardingStep,
} from "@/lib/onboarding/constants"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

type OnboardingStepperProps = {
  /** Only the steps actually being asked, in order. */
  sequence: OnboardingStep[]
  currentStep: OnboardingStep
  /** Furthest step reached, so completed steps can be revisited. */
  furthestStep: OnboardingStep
  onNavigate: (step: OnboardingStep) => void
  disabled?: boolean
}

type StepperNode = {
  key: string
  label: string
  /** Absent for the synthetic sign-in node, which is not navigable. */
  step: OnboardingStep | null
}

/**
 * Sign-in is already done by the time anyone sees this, but counting it means
 * the first real question reads as step 2 rather than step 1. Starting a fresh
 * account at zero progress understates how far along they are.
 */
const SIGNED_IN_NODE: StepperNode = {
  key: "signed_in",
  label: "Sign in",
  step: null,
}

export function OnboardingStepper({
  sequence,
  currentStep,
  furthestStep,
  onNavigate,
  disabled = false,
}: OnboardingStepperProps) {
  const reduceMotion = useReducedMotion()

  const nodes: StepperNode[] = [
    SIGNED_IN_NODE,
    ...sequence.map((step) => ({
      key: step,
      label: ONBOARDING_STEP_LABELS[step],
      step,
    })),
  ]

  // Offset by one throughout: index 0 is the completed sign-in node, so a
  // sequence index of n sits at node index n + 1.
  const currentIndex = sequence.indexOf(currentStep) + 1
  const furthestIndex = sequence.indexOf(furthestStep) + 1
  const progress = nodes.length <= 1 ? 1 : currentIndex / (nodes.length - 1)

  return (
    <nav aria-label="Onboarding progress" className="space-y-3">
      {/* Mobile: a bar plus a position readout. Nine pills do not fit at 375px. */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">
            {currentIndex + 1} of {nodes.length}
          </p>
          <p className="text-muted-foreground text-sm">
            {ONBOARDING_STEP_LABELS[currentStep]}
          </p>
        </div>
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <motion.div
            className="bg-primary h-full rounded-full"
            initial={false}
            animate={{ scaleX: Math.max(progress, 0.04) }}
            style={{ transformOrigin: "left" }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }
            }
          />
        </div>
      </div>

      {/* Desktop: numbered pills with completion state and connectors. */}
      <ol className="hidden items-center gap-1.5 sm:flex">
        {nodes.map((node, index) => {
          const isComplete = index < currentIndex
          const isCurrent = index === currentIndex
          const canNavigate =
            !disabled && node.step !== null && index <= furthestIndex && !isCurrent

          return (
            <li key={node.key} className="flex flex-1 items-center gap-1.5">
              <button
                type="button"
                disabled={!canNavigate}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${node.label}${isComplete ? ", completed" : ""}`}
                onClick={() => {
                  if (canNavigate && node.step) onNavigate(node.step)
                }}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isCurrent &&
                    "border-primary bg-primary text-primary-foreground shadow-sm",
                  isComplete &&
                    "border-primary/40 bg-primary/15 text-primary",
                  isComplete && canNavigate && "hover:bg-primary/25",
                  !isCurrent &&
                    !isComplete &&
                    "border-border bg-muted/50 text-muted-foreground",
                  canNavigate ? "cursor-pointer" : "cursor-default",
                )}
              >
                {isComplete ? (
                  <IconCheck className="size-3.5" aria-hidden />
                ) : (
                  index + 1
                )}
              </button>
              {index < nodes.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-px flex-1 transition-colors",
                    index < currentIndex ? "bg-primary/40" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      <p className="text-muted-foreground hidden text-sm sm:block">
        Step {currentIndex + 1} of {nodes.length}
        {" · "}
        {ONBOARDING_STEP_LABELS[currentStep]}
      </p>
    </nav>
  )
}
