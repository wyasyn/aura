import { OnboardingFrame } from "@/components/onboarding/onboarding-chrome"

/**
 * Layout shell for the onboarding route group. All the visual treatment lives
 * in OnboardingFrame so the skeleton and the real wizard share one silhouette.
 */
export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return <OnboardingFrame>{children}</OnboardingFrame>
}
