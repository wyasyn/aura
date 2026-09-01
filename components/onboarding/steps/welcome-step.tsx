"use client"

import Link from "next/link"
import { IconCamera, IconLeaf, IconShieldLock } from "@tabler/icons-react"

import { OnboardingStepItem } from "@/components/onboarding/onboarding-step-panel"
import type { ConsentState, StepProps } from "@/components/onboarding/wizard-state"
import { Checkbox } from "@/components/ui/checkbox"

const VALUE_POINTS = [
  {
    Icon: IconCamera,
    title: "A read on what your skin is doing",
    body: "One photo, six cosmetic dimensions, in plain language.",
  },
  {
    Icon: IconLeaf,
    title: "Natural steps before products",
    body: "Habits first. Products only when they genuinely help.",
  },
  {
    Icon: IconShieldLock,
    title: "Your photo is not kept",
    body: "Scan photos are analysed and discarded, never stored.",
  },
]

/**
 * Welcome and consent, merged.
 *
 * They used to be separate screens, which meant asking for photo-processing
 * consent before saying what the photo was for. Putting the value proposition
 * and the decision on one screen means the user consents to something they have
 * just been told about.
 */
export function WelcomeStep({
  consent,
  onChange,
  errors,
  disabled,
}: StepProps & {
  consent: ConsentState
  onChange: (next: ConsentState) => void
}) {
  return (
    <div className="space-y-6">
      <OnboardingStepItem>
        <ul className="space-y-4">
          {VALUE_POINTS.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span
                aria-hidden
                className="bg-primary/10 text-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
              >
                <Icon className="size-4.5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </OnboardingStepItem>

      <OnboardingStepItem className="border-border/60 space-y-3 border-t pt-5">
        <ConsentCheckbox
          id="photo-consent"
          checked={consent.photoProcessingConsent}
          onCheckedChange={(value) =>
            onChange({ ...consent, photoProcessingConsent: value })
          }
          disabled={disabled}
        >
          I agree to my photos being processed for cosmetic guidance, and I
          understand this is not a medical diagnosis. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>
          .
        </ConsentCheckbox>

        <ConsentCheckbox
          id="marketing-consent"
          checked={consent.marketingConsent}
          onCheckedChange={(value) =>
            onChange({ ...consent, marketingConsent: value })
          }
          disabled={disabled}
        >
          Email me occasional Aurora updates. Optional, and you can turn this off
          any time.
        </ConsentCheckbox>

        {errors.photoProcessingConsent ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.photoProcessingConsent}
          </p>
        ) : null}
      </OnboardingStepItem>
    </div>
  )
}

function ConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  disabled,
  children,
}: {
  id: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="text-sm leading-relaxed">
        {children}
      </label>
    </div>
  )
}
