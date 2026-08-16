"use client"

import { IconCheck } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

type FeedbackSuccessTickProps = {
  className?: string
  size?: "sm" | "md" | "lg"
  label?: string
}

const SIZE_CLASS = {
  sm: { shell: "size-7", icon: "size-3.5" },
  md: { shell: "size-10", icon: "size-5" },
  lg: { shell: "size-12", icon: "size-5" },
} as const

export function FeedbackSuccessTick({
  className,
  size = "md",
  label = "Feedback submitted",
}: FeedbackSuccessTickProps) {
  const { shell, icon } = SIZE_CLASS[size]

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-(--color-success) text-white shadow-sm",
        shell,
        className,
      )}
    >
      <IconCheck className={icon} stroke={2.5} />
    </span>
  )
}
