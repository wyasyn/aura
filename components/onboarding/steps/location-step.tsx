"use client"

import { IconLoader2, IconMapPin } from "@tabler/icons-react"

import { OnboardingField } from "@/components/onboarding/onboarding-field"
import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import type { LocationState, StepProps } from "@/components/onboarding/wizard-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LocationStep({
  location,
  onChange,
  onDetect,
  detecting,
  hint,
  errors,
  disabled,
}: StepProps & {
  location: LocationState
  onChange: (next: LocationState) => void
  onDetect: () => void
  detecting: boolean
  hint: string | null
}) {
  return (
    <div className="space-y-5">
      <OnboardingStepItem>
        <Button
          type="button"
          variant="outline"
          disabled={detecting || disabled}
          onClick={onDetect}
          className="h-11 w-full rounded-full sm:w-auto sm:px-6"
        >
          {detecting ? (
            <IconLoader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <IconMapPin className="size-4" aria-hidden />
          )}
          {detecting ? "Finding you" : "Use my location"}
        </Button>
        {hint ? (
          <p role="status" className="text-muted-foreground mt-2 text-sm">
            {hint}
          </p>
        ) : null}
      </OnboardingStepItem>

      <OnboardingStepItem>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="bg-border h-px flex-1" aria-hidden />
          or enter it yourself
          <span className="bg-border h-px flex-1" aria-hidden />
        </div>
      </OnboardingStepItem>

      <OnboardingStepItem className="grid gap-4 sm:grid-cols-2">
        <OnboardingField label="City" optional error={errors.city}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={location.city}
              disabled={disabled}
              autoComplete="address-level2"
              onChange={(event) =>
                onChange({ ...location, city: event.target.value })
              }
            />
          )}
        </OnboardingField>

        <OnboardingField label="Region or state" optional error={errors.region}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={location.region}
              disabled={disabled}
              autoComplete="address-level1"
              onChange={(event) =>
                onChange({ ...location, region: event.target.value })
              }
            />
          )}
        </OnboardingField>

        <OnboardingField
          label="Country"
          optional
          error={errors.country}
          className="sm:col-span-2"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={location.country}
              disabled={disabled}
              autoComplete="country-name"
              onChange={(event) =>
                onChange({ ...location, country: event.target.value })
              }
            />
          )}
        </OnboardingField>
      </OnboardingStepItem>
    </div>
  )
}
