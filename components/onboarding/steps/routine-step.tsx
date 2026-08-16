"use client"

import { OnboardingField } from "@/components/onboarding/onboarding-field"
import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import type { RoutineState, StepProps } from "@/components/onboarding/wizard-state"
import { Textarea } from "@/components/ui/textarea"

/**
 * Only shown when a stated concern suggests an existing regimen
 * (see ROUTINE_RELEVANT_CONCERNS in lib/onboarding/steps.ts). Someone here for
 * general upkeep is never asked to list medications.
 */
export function RoutineStep({
  routine,
  onChange,
  errors,
  disabled,
}: StepProps & {
  routine: RoutineState
  onChange: (next: RoutineState) => void
}) {
  return (
    <div className="space-y-5">
      <OnboardingStepItem>
        <OnboardingField
          label="Morning"
          description="Whatever you actually use, in any order."
          optional
          error={errors["currentRoutine.am"]}
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={3}
              value={routine.am}
              disabled={disabled}
              placeholder="Cleanser, moisturiser, SPF"
              onChange={(event) =>
                onChange({ ...routine, am: event.target.value })
              }
            />
          )}
        </OnboardingField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingField
          label="Evening"
          optional
          error={errors["currentRoutine.pm"]}
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={3}
              value={routine.pm}
              disabled={disabled}
              placeholder="Cleanser, serum, night cream"
              onChange={(event) =>
                onChange({ ...routine, pm: event.target.value })
              }
            />
          )}
        </OnboardingField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingField
          label="Prescription treatments"
          description="One per line. We never recommend prescription actives ourselves, but knowing what you already use keeps our suggestions compatible."
          optional
          error={errors.previousPrescriptions}
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={2}
              value={routine.prescriptions}
              disabled={disabled}
              placeholder="tretinoin"
              onChange={(event) =>
                onChange({ ...routine, prescriptions: event.target.value })
              }
            />
          )}
        </OnboardingField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingField
          label="Medications"
          description="One per line. Some affect how skin behaves."
          optional
          error={errors.medications}
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={2}
              value={routine.medications}
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...routine, medications: event.target.value })
              }
            />
          )}
        </OnboardingField>
      </OnboardingStepItem>
    </div>
  )
}
