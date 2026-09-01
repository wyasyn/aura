"use client"

import { IconSparkles } from "@tabler/icons-react"

import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import {
  CONCERN_OPTIONS,
  GOAL_OPTIONS,
  SKIN_TYPE_OPTIONS,
  type LocationState,
  type SkinConcernsState,
  type SkinTypeState,
} from "@/components/onboarding/wizard-state"
import { FITZPATRICK_OPTIONS } from "@/lib/onboarding/constants"
import { SKIN_DIMENSIONS } from "@/lib/scan/dimensions"
import { SKIN_DOSHA_OPTIONS } from "@/lib/scan/dosha"

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string | null {
  return options.find((option) => option.value === value)?.label ?? null
}

/**
 * The payoff screen.
 *
 * Onboarding previously ended on "You're all set", which asks for eight screens
 * of answers and shows nothing back. Reflecting the derived profile makes the
 * intake feel like it bought something, and it doubles as a last chance to spot
 * a wrong answer before the first scan.
 */
export function CompleteStep({
  skinType,
  concerns,
  location,
  freeScans,
}: {
  skinType: SkinTypeState
  concerns: SkinConcernsState
  location: LocationState
  freeScans: number
}) {
  const typeLabel = labelFor(SKIN_TYPE_OPTIONS, skinType.skinType)
  const sunLabel = labelFor(FITZPATRICK_OPTIONS, skinType.fitzpatrickBand)
  const doshaLabel = labelFor(SKIN_DOSHA_OPTIONS, skinType.skinDosha)
  const concernLabels = concerns.primaryConcerns
    .map((value) => labelFor(CONCERN_OPTIONS, value))
    .filter((label): label is string => label !== null)
  const goalLabels = concerns.skinGoals
    .map((value) => labelFor(GOAL_OPTIONS, value))
    .filter((label): label is string => label !== null)
  const place = [location.city, location.country].filter(Boolean).join(", ")

  const rows: { label: string; value: string }[] = []
  if (typeLabel) rows.push({ label: "Skin type", value: typeLabel })
  if (sunLabel) rows.push({ label: "Sun sensitivity", value: sunLabel })
  if (doshaLabel) rows.push({ label: "Ayurvedic lean", value: doshaLabel })
  if (concernLabels.length > 0) {
    rows.push({ label: "Working on", value: concernLabels.join(", ") })
  }
  if (goalLabels.length > 0) {
    rows.push({ label: "Aiming for", value: goalLabels.join(", ") })
  }
  if (concerns.hasAllergies && concerns.allergies.trim()) {
    rows.push({ label: "Avoiding", value: concerns.allergies.trim() })
  }
  if (place) rows.push({ label: "Climate", value: place })

  return (
    <div className="space-y-6">
      {rows.length > 0 ? (
        <OnboardingStepItem>
          <dl className="border-border/60 bg-background/40 divide-border/50 divide-y rounded-2xl border">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 px-4 py-3"
              >
                <dt className="text-muted-foreground shrink-0 text-sm">
                  {row.label}
                </dt>
                <dd className="text-right text-sm font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </OnboardingStepItem>
      ) : null}

      <OnboardingStepItem className="space-y-3">
        <p className="text-sm font-medium">Your first scan will look at</p>
        <ul className="flex flex-wrap gap-2">
          {SKIN_DIMENSIONS.map((dimension) => (
            <li
              key={dimension.id}
              className="border-border/60 bg-background/60 text-muted-foreground rounded-full border px-3 py-1.5 text-xs"
            >
              {dimension.label}
            </li>
          ))}
        </ul>
      </OnboardingStepItem>

      {freeScans > 0 ? (
        <OnboardingStepItem>
          <p className="bg-primary/10 text-primary flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <IconSparkles className="size-4 shrink-0" aria-hidden />
            {freeScans} free Starter {freeScans === 1 ? "scan" : "scans"} added
            to your account.
          </p>
        </OnboardingStepItem>
      ) : null}

      <OnboardingStepItem>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Everything here can be changed later in Settings.
        </p>
      </OnboardingStepItem>
    </div>
  )
}
