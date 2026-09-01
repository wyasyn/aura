import { OnboardingFrame } from "@/components/onboarding/onboarding-chrome"
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton"

export default function OnboardingLoading() {
  return (
    <OnboardingFrame>
      <OnboardingSkeleton />
    </OnboardingFrame>
  )
}
