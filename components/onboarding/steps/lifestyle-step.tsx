"use client"

import { ChipSingleSelect } from "@/components/onboarding/chip-group"
import { OnboardingGroupField } from "@/components/onboarding/onboarding-field"
import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import {
  LIFESTYLE_QUESTIONS,
  type LifestyleState,
  type StepProps,
} from "@/components/onboarding/wizard-state"

/**
 * Four chip rows instead of four dropdowns. The labels used to be generated
 * from the field names ("Sun exposure" via a regex), which produced machine
 * copy; they are written out now.
 */
export function LifestyleStep({
  lifestyle,
  onChange,
  errors,
  disabled,
}: StepProps & {
  lifestyle: LifestyleState
  onChange: (next: LifestyleState) => void
}) {
  return (
    <div className="space-y-6">
      {LIFESTYLE_QUESTIONS.map((question) => (
        <OnboardingStepItem key={question.field}>
          <OnboardingGroupField
            label={question.label}
            error={errors[`lifestyleFactors.${question.field}`]}
          >
            <ChipSingleSelect
              ariaLabel={question.label}
              options={question.options}
              value={lifestyle[question.field]}
              disabled={disabled}
              onChange={(value) =>
                onChange({ ...lifestyle, [question.field]: value })
              }
            />
          </OnboardingGroupField>
        </OnboardingStepItem>
      ))}
    </div>
  )
}
