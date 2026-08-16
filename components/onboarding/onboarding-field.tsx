"use client"

import { useId } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type OnboardingFieldProps = {
  label: string
  /** Rendered under the label, and wired up via aria-describedby. */
  description?: string
  error?: string
  optional?: boolean
  className?: string
  /**
   * Receives the ids to attach to the control. Wiring them is what makes the
   * error and description reach a screen reader, so every field goes through
   * this rather than hand-rolling a <Label> plus a loose <p>.
   */
  children: (props: {
    id: string
    "aria-describedby": string | undefined
    "aria-invalid": boolean | undefined
  }) => React.ReactNode
}

export function OnboardingField({
  label,
  description,
  error,
  optional,
  className,
  children,
}: OnboardingFieldProps) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <Label htmlFor={id} className="flex items-center gap-2">
          {label}
          {optional ? (
            <span className="text-muted-foreground text-xs font-normal">
              Optional
            </span>
          ) : null}
        </Label>
        {description ? (
          <p
            id={descriptionId}
            className="text-muted-foreground text-sm leading-relaxed"
          >
            {description}
          </p>
        ) : null}
      </div>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Field wrapper for chip groups, which are labelled by aria-label not htmlFor. */
export function OnboardingGroupField({
  label,
  description,
  error,
  optional,
  className,
  children,
}: Omit<OnboardingFieldProps, "children"> & { children: React.ReactNode }) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {label}
          {optional ? (
            <span className="text-muted-foreground text-xs font-normal">
              Optional
            </span>
          ) : null}
        </p>
        {description ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
