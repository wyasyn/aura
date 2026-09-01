"use client"

import { estimatePasswordStrength } from "@/lib/auth/form-schemas"
import { cn } from "@/lib/utils"

const BAR_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-amber-400",
  "bg-emerald-500",
]

/**
 * Advisory strength meter for new passwords. It never blocks submission: the
 * only hard requirement is the 8-character minimum enforced by the schema.
 */
export function PasswordStrengthMeter({ value }: { value: string }) {
  if (!value) return null

  const { score, label, hint } = estimatePasswordStrength(value)

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < score ? BAR_COLORS[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        <span className="text-foreground font-medium">{label}</span>
        {hint ? <span>{`. ${hint}.`}</span> : null}
      </p>
    </div>
  )
}
