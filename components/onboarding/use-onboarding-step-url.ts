"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { DEFAULT_POST_ONBOARDING_PATH } from "@/lib/auth/callback-url"
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/lib/onboarding/constants"
import { normalizeStoredStep } from "@/lib/onboarding/steps"

export function parseOnboardingStep(
  value: string | null | undefined,
): OnboardingStep | null {
  if (!value) return null
  return ONBOARDING_STEPS.includes(value as OnboardingStep)
    ? (value as OnboardingStep)
    : null
}

/**
 * Clamps a URL step to what the user has actually reached, so `?step=complete`
 * cannot be typed in to skip the intake. Falls back to the furthest step for
 * anything unrecognised.
 */
export function resolveOnboardingStep(
  urlStep: string | null | undefined,
  furthestStep: OnboardingStep,
): OnboardingStep {
  const parsed = parseOnboardingStep(urlStep)
  if (!parsed) return furthestStep

  const furthestIndex = ONBOARDING_STEPS.indexOf(furthestStep)
  const urlIndex = ONBOARDING_STEPS.indexOf(parsed)
  if (urlIndex < 0 || urlIndex > furthestIndex) return furthestStep

  return parsed
}

export function useOnboardingStepUrl(
  initialStep: OnboardingStep,
  callbackUrl?: string,
) {
  const searchParams = useSearchParams()
  // Accounts stored on a pre-restructure step id resume rather than restarting.
  const normalizedInitial = normalizeStoredStep(initialStep)
  const [furthestStep, setFurthestStep] = useState(normalizedInitial)
  const [step, setStep] = useState<OnboardingStep>(() =>
    resolveOnboardingStep(searchParams.get("step"), normalizedInitial),
  )

  const buildHref = useCallback(
    (next: OnboardingStep) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("step", next)
      if (callbackUrl && callbackUrl !== DEFAULT_POST_ONBOARDING_PATH) {
        params.set("callbackUrl", callbackUrl)
      } else {
        params.delete("callbackUrl")
      }
      const query = params.toString()
      return query ? `/onboarding?${query}` : "/onboarding"
    },
    [searchParams, callbackUrl],
  )

  const syncUrl = useCallback(
    (next: OnboardingStep, mode: "replace" | "push" = "replace") => {
      const href = buildHref(next)
      if (mode === "push") {
        window.history.pushState({ onboardingStep: next }, "", href)
      } else {
        window.history.replaceState({ onboardingStep: next }, "", href)
      }
    },
    [buildHref],
  )

  const goToStep = useCallback(
    (next: OnboardingStep) => {
      setStep(next)
      setFurthestStep((current) =>
        ONBOARDING_STEPS.indexOf(next) > ONBOARDING_STEPS.indexOf(current)
          ? next
          : current,
      )
      syncUrl(next, "replace")
    },
    [syncUrl],
  )

  useEffect(() => {
    const urlStep = searchParams.get("step")
    const resolved = resolveOnboardingStep(urlStep, furthestStep)
    setStep(resolved)
    if (urlStep !== resolved) {
      syncUrl(resolved, "replace")
    }
  }, [searchParams, furthestStep, syncUrl])

  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search)
      setStep(resolveOnboardingStep(params.get("step"), furthestStep))
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [furthestStep])

  return { step, furthestStep, goToStep }
}
