import { cn } from "@/lib/utils"

/**
 * Decorative dotted-grid background layer. Absolutely positioned and
 * non-interactive, so it sits behind content without capturing pointer events.
 * The dot color follows the active theme via the .dot-field utility.
 */
export function DotField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "dot-field pointer-events-none absolute inset-0 -z-10",
        className,
      )}
    />
  )
}
