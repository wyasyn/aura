"use client"

import {
  StatefulButton,
  type ButtonState,
} from "@/components/motion/button/stateful"
import { Button } from "@/components/ui/button"

type OnboardingStepActionsProps = {
  label: string
  state: ButtonState
  canGoBack: boolean
  showBack?: boolean
  onBack: () => void
  onContinue: () => void
  skipLabel?: string
  onSkip?: () => void
}

/**
 * Sticky on mobile so the primary action never falls below the fold on the
 * longer steps, inline from `sm` up where the card fits on one screen.
 * Safe-area padding keeps it clear of the iOS home indicator.
 */
export function OnboardingStepActions({
  label,
  state,
  canGoBack,
  showBack = true,
  onBack,
  onContinue,
  skipLabel = "Skip for now",
  onSkip,
}: OnboardingStepActionsProps) {
  const busy = state === "loading"

  return (
    <div className="border-border/60 bg-background/85 fixed inset-x-0 bottom-0 z-20 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-2 sm:pb-0 sm:backdrop-blur-none">
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 sm:max-w-none">
        {showBack && canGoBack ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onBack}
            className="h-11 rounded-full px-5"
          >
            Back
          </Button>
        ) : null}

        <StatefulButton
          type="button"
          state={state}
          onClick={onContinue}
          loadingText="Saving"
          successText="Saved"
          errorText="Try again"
          className="h-11 flex-1 rounded-full sm:flex-none sm:px-8"
        >
          {label}
        </StatefulButton>

        {onSkip ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground h-11 rounded-full px-4 text-sm"
          >
            {skipLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
