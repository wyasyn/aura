"use client"

import { IconCheck } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

export type ChipOption = {
  value: string
  label: string
  hint?: string
}

type BaseProps = {
  options: readonly ChipOption[]
  /** Accessible name for the group, since the visible Label is separate. */
  ariaLabel: string
  disabled?: boolean
  className?: string
}

/**
 * Multi-select chips.
 *
 * Uses real checkbox semantics rather than styled buttons, so screen readers
 * announce the selected state and the group can be operated from the keyboard
 * the way a form control should be.
 */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  className,
}: BaseProps & {
  value: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(option: string) {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    )
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => toggle(option.value)}
            className={chipClassName(selected)}
          >
            {selected ? (
              <IconCheck className="size-3.5 shrink-0" aria-hidden />
            ) : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Single-select chips, as a radio group. Replaces the dropdowns that made the
 * lifestyle and skin-type steps feel like a database form.
 */
export function ChipSingleSelect({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  className,
  allowClear = false,
}: BaseProps & {
  value: string
  onChange: (next: string) => void
  /** Lets an optional question be un-answered again after a mis-tap. */
  allowClear?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            title={option.hint}
            onClick={() =>
              onChange(selected && allowClear ? "" : option.value)
            }
            className={chipClassName(selected)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function chipClassName(selected: boolean): string {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:cursor-not-allowed disabled:opacity-50",
    selected
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-background/60 text-foreground hover:border-primary/50 hover:bg-accent",
  )
}

/**
 * Chips with a description underneath, for options that need explaining
 * (sun sensitivity, dosha lean). Renders as a stacked card list on mobile.
 */
export function ChipCardSelect({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  className,
}: BaseProps & {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid gap-2 sm:grid-cols-2", className)}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? "" : option.value)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-background/60 hover:border-primary/50 hover:bg-accent",
            )}
          >
            <span className="block text-sm font-medium">{option.label}</span>
            {option.hint ? (
              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                {option.hint}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
