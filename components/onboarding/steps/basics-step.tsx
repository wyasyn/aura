"use client"

import { DateOfBirthField } from "@/components/onboarding/date-of-birth-field"
import { OnboardingField } from "@/components/onboarding/onboarding-field"
import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import { ChipSingleSelect } from "@/components/onboarding/chip-group"
import { OnboardingGroupField } from "@/components/onboarding/onboarding-field"
import type { BasicsState, StepProps } from "@/components/onboarding/wizard-state"
import { Input } from "@/components/ui/input"

const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const

export function BasicsStep({
  basics,
  onChange,
  errors,
  disabled,
}: StepProps & {
  basics: BasicsState
  onChange: (next: BasicsState) => void
}) {
  return (
    <div className="space-y-5">
      <OnboardingStepItem>
        <OnboardingField label="Name" error={errors.name}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={basics.name}
              disabled={disabled}
              autoComplete="name"
              onChange={(event) =>
                onChange({ ...basics, name: event.target.value })
              }
            />
          )}
        </OnboardingField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingField
          label="Date of birth"
          description="Used only to derive an age band, which changes how the photo is read."
          error={errors.dateOfBirth}
        >
          {(fieldProps) => (
            <DateOfBirthField
              id={fieldProps.id}
              value={basics.dateOfBirth}
              onChange={(dateOfBirth) => onChange({ ...basics, dateOfBirth })}
            />
          )}
        </OnboardingField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingGroupField
          label="Biological sex"
          description="Stored on your profile only. It is not sent to the analysis model."
          optional
          error={errors.biologicalSex}
        >
          <ChipSingleSelect
            ariaLabel="Biological sex"
            options={SEX_OPTIONS}
            value={basics.biologicalSex}
            disabled={disabled}
            allowClear
            onChange={(biologicalSex) => onChange({ ...basics, biologicalSex })}
          />
        </OnboardingGroupField>
      </OnboardingStepItem>
    </div>
  )
}
