import { OnboardingCard } from "@/components/onboarding/onboarding-chrome"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors the real wizard's layout: stepper, then a card with a heading and
 * chip rows. The previous version rendered a centred header and a bordered card
 * the live UI never showed, so loading visibly jumped.
 */
export function OnboardingSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="flex flex-1 items-center gap-1.5">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              {index < 8 ? <Skeleton className="h-px flex-1" /> : null}
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-40" />
      </div>

      <OnboardingCard>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>

          {Array.from({ length: 2 }).map((_, group) => (
            <div key={group} className="space-y-3">
              <Skeleton className="h-4 w-44" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, chip) => (
                  <Skeleton key={chip} className="h-10 w-28 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </OnboardingCard>

      <Skeleton className="h-11 w-full rounded-full sm:w-40" />
    </div>
  )
}
