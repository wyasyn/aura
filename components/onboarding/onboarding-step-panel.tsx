"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef } from "react"

import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

type OnboardingStepPanelProps = {
  stepKey: string
  children: React.ReactNode
}

export function OnboardingStepPanel({
  stepKey,
  children,
}: OnboardingStepPanelProps) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function OnboardingStepItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 300, damping: 26 }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * The heading for each step.
 *
 * Takes focus whenever the step changes, so a keyboard or screen-reader user is
 * moved into the new content instead of being left on a button that no longer
 * exists. `tabIndex={-1}` makes it programmatically focusable without adding it
 * to the tab order.
 */
export function OnboardingStepHeading({
  stepKey,
  title,
  description,
  className,
}: {
  stepKey: string
  title: string
  description?: string
  className?: string
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [stepKey])

  return (
    <div className={cn("space-y-2", className)}>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-heading text-2xl font-medium tracking-tight outline-none sm:text-[1.75rem]"
      >
        {title}
      </h1>
      {description ? (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  )
}
