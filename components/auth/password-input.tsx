"use client"

import { useId, useState } from "react"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface PasswordInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
  tabIndex?: number
  className?: string
  disabled?: boolean
  /** Helper text under the label, wired up via aria-describedby. */
  description?: string
  /** Field-level error, announced via role="alert" and aria-invalid. */
  error?: string
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  tabIndex,
  className,
  disabled,
  description,
  error,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const reactId = useId()
  const descriptionId = description ? `${reactId}-description` : undefined
  const errorId = error ? `${reactId}-error` : undefined
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p id={descriptionId} className="text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          tabIndex={tabIndex}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="text-muted-foreground hover:text-foreground absolute right-0 bottom-1 flex size-8 items-center justify-center rounded-md transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? (
            <IconEyeOff className="size-4" aria-hidden />
          ) : (
            <IconEye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
