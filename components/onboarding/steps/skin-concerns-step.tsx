"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { ChipMultiSelect } from "@/components/onboarding/chip-group"
import {
  OnboardingField,
  OnboardingGroupField,
} from "@/components/onboarding/onboarding-field"
import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import {
  CONCERN_OPTIONS,
  GOAL_OPTIONS,
  type SkinConcernsState,
  type StepProps,
} from "@/components/onboarding/wizard-state"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { EASE_OUT } from "@/lib/ease"

export function SkinConcernsStep({
  skin,
  onChange,
  errors,
  disabled,
}: StepProps & {
  skin: SkinConcernsState
  onChange: (next: SkinConcernsState) => void
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="space-y-6">
      <OnboardingStepItem>
        <OnboardingGroupField
          label="What would you most like to work on?"
          description="Pick as many as apply. Every one you choose gets addressed in your scan summary."
          optional
          error={errors.primaryConcerns}
        >
          <ChipMultiSelect
            ariaLabel="Primary concerns"
            options={CONCERN_OPTIONS}
            value={skin.primaryConcerns}
            disabled={disabled}
            onChange={(primaryConcerns) =>
              onChange({ ...skin, primaryConcerns })
            }
          />
        </OnboardingGroupField>
      </OnboardingStepItem>

      <OnboardingStepItem>
        <OnboardingGroupField
          label="And what are you aiming for?"
          optional
          error={errors.skinGoals}
        >
          <ChipMultiSelect
            ariaLabel="Skin goals"
            options={GOAL_OPTIONS}
            value={skin.skinGoals}
            disabled={disabled}
            onChange={(skinGoals) => onChange({ ...skin, skinGoals })}
          />
        </OnboardingGroupField>
      </OnboardingStepItem>

      <OnboardingStepItem className="border-border/60 space-y-3 border-t pt-5">
        {/* Asked as a yes/no first: most people have nothing to type here, and
            an empty textarea reads as a demand for an answer. */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="has-allergies"
            checked={skin.hasAllergies}
            disabled={disabled}
            onCheckedChange={(value) =>
              onChange({
                ...skin,
                hasAllergies: value === true,
                allergies: value === true ? skin.allergies : "",
              })
            }
            className="mt-0.5"
          />
          <label htmlFor="has-allergies" className="text-sm leading-relaxed">
            I have allergies or ingredient sensitivities.
          </label>
        </div>

        <AnimatePresence initial={false}>
          {skin.hasAllergies ? (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={
                reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }
              }
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <OnboardingField
                label="What should we avoid?"
                description="Names are enough, for example nuts, fragrance, shea. We check every product's ingredient list against this."
                error={errors.allergies}
                className="pt-1"
              >
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={skin.allergies}
                    disabled={disabled}
                    rows={3}
                    placeholder="nuts, fragrance"
                    onChange={(event) =>
                      onChange({ ...skin, allergies: event.target.value })
                    }
                  />
                )}
              </OnboardingField>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex items-start gap-3">
          <Checkbox
            id="expert-review"
            checked={skin.expertReviewRequested}
            disabled={disabled}
            onCheckedChange={(value) =>
              onChange({ ...skin, expertReviewRequested: value === true })
            }
            className="mt-0.5"
          />
          <label htmlFor="expert-review" className="text-sm leading-relaxed">
            Let me know when expert review becomes available.
          </label>
        </div>
      </OnboardingStepItem>
    </div>
  )
}
