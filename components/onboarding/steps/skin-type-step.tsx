"use client"

import {
  ChipCardSelect,
  ChipSingleSelect,
} from "@/components/onboarding/chip-group"
import { OnboardingGroupField } from "@/components/onboarding/onboarding-field"
import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import {
  SKIN_TYPE_OPTIONS,
  type SkinTypeState,
  type StepProps,
} from "@/components/onboarding/wizard-state"
import { FITZPATRICK_OPTIONS } from "@/lib/onboarding/constants"
import { SKIN_DOSHA_OPTIONS } from "@/lib/scan/dosha"

/**
 * First half of the old `skin` step.
 *
 * That screen stacked three dropdowns, fourteen toggle buttons, a textarea and
 * a checkbox into one scroll. Splitting it in two, and using chips rather than
 * selects, gets each screen down to something answerable in a few taps.
 */
export function SkinTypeStep({
  skin,
  onChange,
  errors,
  disabled,
}: StepProps & {
  skin: SkinTypeState
  onChange: (next: SkinTypeState) => void
}) {
  return (
    <div className="space-y-6">
      <OnboardingStepItem>
        <OnboardingGroupField
          label="How does your skin usually behave?"
          optional
          error={errors.skinType}
        >
          <ChipCardSelect
            ariaLabel="Skin type"
            options={SKIN_TYPE_OPTIONS}
            value={skin.skinType}
            disabled={disabled}
            onChange={(skinType) => onChange({ ...skin, skinType })}
          />
        </OnboardingGroupField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingGroupField
          label="How does your skin react to sun?"
          description="Shapes the UV guidance you get. Pick the closest match."
          optional
          error={errors.fitzpatrickBand}
        >
          <ChipCardSelect
            ariaLabel="Sun sensitivity"
            options={FITZPATRICK_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              hint: option.hint,
            }))}
            value={skin.fitzpatrickBand}
            disabled={disabled}
            onChange={(fitzpatrickBand) =>
              onChange({ ...skin, fitzpatrickBand })
            }
          />
        </OnboardingGroupField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingGroupField
          label="Ayurvedic lean"
          description="Cosmetic wellness framing only. Skip it if the terms are unfamiliar."
          optional
          error={errors.skinDosha}
        >
          <ChipSingleSelect
            ariaLabel="Ayurvedic skin lean"
            options={SKIN_DOSHA_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              hint: option.hint,
            }))}
            value={skin.skinDosha}
            disabled={disabled}
            allowClear
            onChange={(skinDosha) => onChange({ ...skin, skinDosha })}
          />
        </OnboardingGroupField>
      </OnboardingStepItem>
    </div>
  )
}
