import Link from "next/link"

import { DotField } from "@/components/ui/dot-field"
import { cn } from "@/lib/utils"

/**
 * Onboarding chrome, built from the same surfaces as the scan flow
 * (.scan-surface, .scan-halo, DotField) so a new account's first screen and
 * their first scan read as one product rather than two.
 */
export function OnboardingFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <DotField className="opacity-60" />
      <OnboardingBrandHeader />
      <main
        className={cn(
          "relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-28 pt-4 sm:px-6 sm:pb-12",
          className,
        )}
      >
        {children}
      </main>
    </div>
  )
}

function OnboardingBrandHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-xl items-center justify-between px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-full text-sm font-semibold"
        >
          A
        </span>
        <span className="font-heading text-sm font-medium tracking-tight">
          Aurora Organics
        </span>
      </Link>
    </header>
  )
}

/**
 * The elevated card each step sits on. Matches ScanStepShell's treatment so the
 * two flows share a silhouette.
 */
export function OnboardingCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "scan-surface scan-halo relative rounded-[2rem] border border-border/70 p-6 backdrop-blur-xl sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  )
}
