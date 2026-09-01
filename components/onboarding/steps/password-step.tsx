"use client"

import { PasswordInput } from "@/components/auth/password-input"
import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import type { PasswordState, StepProps } from "@/components/onboarding/wizard-state"

export function PasswordStep({
  password,
  onChange,
  errors,
  disabled,
}: StepProps & {
  password: PasswordState
  onChange: (next: PasswordState) => void
}) {
  return (
    <div className="space-y-5">
      <OnboardingStepItem className="space-y-2">
        <PasswordInput
          id="onboarding-password"
          label="Password"
          value={password.password}
          autoComplete="new-password"
          minLength={8}
          error={errors.password}
          description="At least 8 characters."
          disabled={disabled}
          onChange={(value) => onChange({ ...password, password: value })}
        />
      </OnboardingStepItem>

      <OnboardingStepItem className="space-y-2">
        <PasswordInput
          id="onboarding-password-confirm"
          label="Confirm password"
          value={password.confirmPassword}
          autoComplete="new-password"
          error={errors.confirmPassword}
          disabled={disabled}
          onChange={(value) =>
            onChange({ ...password, confirmPassword: value })
          }
        />
      </OnboardingStepItem>
    </div>
  )
}
