"use client"

import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import type { ButtonState } from "@/components/motion/button/stateful"
import { OnboardingCard } from "@/components/onboarding/onboarding-chrome"
import { OnboardingStepActions } from "@/components/onboarding/onboarding-step-actions"
import {
  OnboardingStepHeading,
  OnboardingStepItem,
  OnboardingStepPanel,
} from "@/components/onboarding/onboarding-step-panel"
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper"
import { useOnboardingStepUrl } from "@/components/onboarding/use-onboarding-step-url"
import { BasicsStep } from "@/components/onboarding/steps/basics-step"
import { CompleteStep } from "@/components/onboarding/steps/complete-step"
import { LifestyleStep } from "@/components/onboarding/steps/lifestyle-step"
import { LocationStep } from "@/components/onboarding/steps/location-step"
import { PasswordStep } from "@/components/onboarding/steps/password-step"
import { RoutineStep } from "@/components/onboarding/steps/routine-step"
import { SkinConcernsStep } from "@/components/onboarding/steps/skin-concerns-step"
import { SkinTypeStep } from "@/components/onboarding/steps/skin-type-step"
import { WelcomeStep } from "@/components/onboarding/steps/welcome-step"
import type {
  BasicsState,
  ConsentState,
  LifestyleState,
  LocationState,
  PasswordState,
  RoutineState,
  SkinConcernsState,
  SkinTypeState,
} from "@/components/onboarding/wizard-state"
import { DEFAULT_POST_ONBOARDING_PATH } from "@/lib/auth/callback-url"
import {
  toUserMessage,
  validate,
  type FieldErrors,
} from "@/lib/onboarding/client-validation"
import { type OnboardingStep } from "@/lib/onboarding/constants"
import {
  basicsSchema,
  consentSchema,
  lifestyleSchema,
  locationSchema,
  passwordSchema,
  routineSchema,
  skinSchema,
} from "@/lib/onboarding/schemas"
import {
  getStepDefinition,
  resolveNextStep,
  resolvePreviousStep,
  resolveStepSequence,
  type OnboardingBranchState,
} from "@/lib/onboarding/steps"
import {
  completeOnboardingAction,
  resolveBrowserLocationAction,
  saveBasicsAction,
  saveConsentAction,
  saveLifestyleAction,
  saveLocationAction,
  savePasswordAction,
  saveRoutineAction,
  saveSkinAction,
  setWelcomeStepAction,
  skipPasswordAction,
  skipToOnboardingStepAction,
} from "@/lib/onboarding/actions"

type OnboardingWizardProps = {
  initialStep: OnboardingStep
  userName: string
  callbackUrl?: string
  /** False when the account already has a password credential. */
  needsPassword?: boolean
  freeScans?: number
}

/** Copy for each step's title, kept beside the step definitions it belongs to. */
const STEP_TITLES: Record<OnboardingStep, string> = {
  welcome: "Let's get your skin read properly",
  basics: "A little about you",
  skin_type: "Your skin, day to day",
  skin_concerns: "What matters most",
  routine: "What you use already",
  lifestyle: "A few habits",
  location: "Where you are",
  password: "Secure your account",
  complete: "Your profile is ready",
}

export function OnboardingWizard({
  initialStep,
  userName,
  callbackUrl = DEFAULT_POST_ONBOARDING_PATH,
  needsPassword = true,
  freeScans = 1,
}: OnboardingWizardProps) {
  const router = useRouter()
  const { step, furthestStep, goToStep } = useOnboardingStepUrl(
    initialStep,
    callbackUrl,
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const [pending, startTransition] = useTransition()

  const [consent, setConsent] = useState<ConsentState>({
    photoProcessingConsent: false,
    marketingConsent: false,
  })
  const [basics, setBasics] = useState<BasicsState>({
    name: userName,
    dateOfBirth: "",
    biologicalSex: "",
  })
  const [skinType, setSkinType] = useState<SkinTypeState>({
    skinType: "",
    fitzpatrickBand: "",
    skinDosha: "",
  })
  const [concerns, setConcerns] = useState<SkinConcernsState>({
    primaryConcerns: [],
    skinGoals: [],
    hasAllergies: false,
    allergies: "",
    expertReviewRequested: false,
  })
  const [routine, setRoutine] = useState<RoutineState>({
    am: "",
    pm: "",
    prescriptions: "",
    medications: "",
  })
  const [lifestyle, setLifestyle] = useState<LifestyleState>({
    sunExposure: "moderate",
    smoking: "never",
    sleepHours: "7_to_8",
    waterIntake: "moderate",
  })
  const [location, setLocation] = useState<LocationState>({
    city: "",
    region: "",
    country: "",
    postalCode: "",
    locationSource: "manual",
  })
  const [password, setPassword] = useState<PasswordState>({
    password: "",
    confirmPassword: "",
  })
  const [locationDetecting, setLocationDetecting] = useState(false)
  const [locationHint, setLocationHint] = useState<string | null>(null)

  // Branch state drives which steps are asked. Recomputed as answers change, so
  // the stepper and the "next" target stay in sync with what the user said.
  const branchState: OnboardingBranchState = useMemo(
    () => ({
      primaryConcerns: concerns.primaryConcerns,
      hasAllergies: concerns.hasAllergies,
      needsPassword,
    }),
    [concerns.primaryConcerns, concerns.hasAllergies, needsPassword],
  )

  const sequence = useMemo(
    () => resolveStepSequence(branchState),
    [branchState],
  )
  const definition = getStepDefinition(step)
  const previousStep = resolvePreviousStep(step, branchState)

  const advance = useCallback(
    (from: OnboardingStep) => {
      setErrors({})
      goToStep(resolveNextStep(from, branchState))
    },
    [branchState, goToStep],
  )

  /**
   * Runs a step: validate on the client, dispatch the server action, advance.
   * Every step goes through this so none of them can quietly skip validation,
   * error handling, or the button state machine, which is how the old wizard
   * ended up with two steps that threw into the error boundary.
   */
  const submitStep = useCallback(
    <T,>(options: {
      validateInput?: () => { ok: true; data: T } | { ok: false; errors: FieldErrors; message: string }
      action: (data: T) => Promise<unknown>
      fallbackError: string
      onSuccess?: () => void
    }) => {
      let payload: T | undefined

      if (options.validateInput) {
        const result = options.validateInput()
        if (!result.ok) {
          setErrors(result.errors)
          setButtonState("error")
          window.setTimeout(() => setButtonState("idle"), 1600)
          return
        }
        payload = result.data
      }

      setErrors({})
      setButtonState("loading")

      startTransition(async () => {
        try {
          await options.action(payload as T)
          setButtonState("idle")
          options.onSuccess?.()
        } catch (err) {
          const message = toUserMessage(err, options.fallbackError)
          setErrors({ _: message })
          setButtonState("error")
          toast.error(message)
          window.setTimeout(() => setButtonState("idle"), 1600)
        }
      })
    },
    [],
  )

  function goBack() {
    if (!previousStep) return
    setErrors({})
    goToStep(previousStep)
  }

  function skipStep() {
    const next = resolveNextStep(step, branchState)
    setButtonState("loading")
    startTransition(async () => {
      try {
        await skipToOnboardingStepAction(next)
        setErrors({})
        setButtonState("idle")
        goToStep(next)
      } catch (err) {
        const message = toUserMessage(err, "Could not skip this step.")
        setErrors({ _: message })
        setButtonState("idle")
        toast.error(message)
      }
    })
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationHint(null)
      toast.error("Your browser cannot share a location. Enter it below.")
      return
    }

    setLocationDetecting(true)
    setLocationHint(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        startTransition(async () => {
          try {
            const result = await resolveBrowserLocationAction(
              position.coords.latitude,
              position.coords.longitude,
            )
            if (!result.ok) {
              toast.error(result.error)
              return
            }
            const resolved = result.data
            setLocation((current) => ({
              ...current,
              city: resolved.city,
              region: resolved.region,
              country: resolved.country,
              latitude: resolved.latitude,
              longitude: resolved.longitude,
              locationSource: resolved.locationSource,
            }))
            const label = [resolved.city, resolved.country]
              .filter(Boolean)
              .join(", ")
            setLocationHint(label ? `Found you in ${label}.` : "Location found.")
          } catch (err) {
            toast.error(
              toUserMessage(err, "Could not find you. Enter your city below."),
            )
          } finally {
            setLocationDetecting(false)
          }
        })
      },
      () => {
        setLocationDetecting(false)
        toast.error("Could not access your location. Enter your city below.")
      },
    )
  }

  const disabled = pending
  const stepProps = { errors, disabled }

  const actionsByStep: Record<
    OnboardingStep,
    { label: string; onContinue: () => void }
  > = {
    welcome: {
      label: "Get started",
      onContinue: () =>
        submitStep({
          validateInput: () => validate(consentSchema, consent),
          action: async (data) => {
            await setWelcomeStepAction()
            await saveConsentAction(data)
          },
          fallbackError: "Could not save your consent.",
          onSuccess: () => advance("welcome"),
        }),
    },
    basics: {
      label: "Continue",
      onContinue: () =>
        submitStep({
          validateInput: () =>
            validate(basicsSchema, {
              ...basics,
              biologicalSex: basics.biologicalSex || undefined,
            }),
          action: (data) => saveBasicsAction(data),
          fallbackError: "Could not save your details.",
          onSuccess: () => advance("basics"),
        }),
    },
    skin_type: {
      label: "Continue",
      onContinue: () =>
        submitStep({
          validateInput: () =>
            validate(skinSchema, {
              ...skinType,
              primaryConcerns: concerns.primaryConcerns,
              skinGoals: concerns.skinGoals,
            }),
          action: (data) => saveSkinAction(data, "skin_type"),
          fallbackError: "Could not save your skin profile.",
          onSuccess: () => advance("skin_type"),
        }),
    },
    skin_concerns: {
      label: "Continue",
      onContinue: () =>
        submitStep({
          validateInput: () =>
            validate(skinSchema, {
              ...skinType,
              primaryConcerns: concerns.primaryConcerns,
              skinGoals: concerns.skinGoals,
              allergies: concerns.hasAllergies
                ? concerns.allergies
                : undefined,
              expertReviewRequested: concerns.expertReviewRequested,
            }),
          action: (data) => saveSkinAction(data, "skin_concerns"),
          fallbackError: "Could not save your focus areas.",
          onSuccess: () => advance("skin_concerns"),
        }),
    },
    routine: {
      label: "Continue",
      onContinue: () =>
        submitStep({
          validateInput: () =>
            validate(routineSchema, {
              currentRoutine: { am: routine.am, pm: routine.pm },
              previousPrescriptions: parseLines(routine.prescriptions).map(
                (name) => ({ name, active: true }),
              ),
              medications: parseLines(routine.medications).map((name) => ({
                name,
              })),
            }),
          action: (data) => saveRoutineAction(data),
          fallbackError: "Could not save your routine.",
          onSuccess: () => advance("routine"),
        }),
    },
    lifestyle: {
      label: "Continue",
      onContinue: () =>
        submitStep({
          validateInput: () =>
            validate(lifestyleSchema, { lifestyleFactors: lifestyle }),
          action: (data) => saveLifestyleAction(data),
          fallbackError: "Could not save your lifestyle answers.",
          onSuccess: () => advance("lifestyle"),
        }),
    },
    location: {
      label: "Continue",
      onContinue: () =>
        submitStep({
          validateInput: () => validate(locationSchema, location),
          action: (data) => saveLocationAction(data),
          fallbackError: "Could not save your location.",
          onSuccess: () => advance("location"),
        }),
    },
    password: {
      label: password.password ? "Save and continue" : "Continue",
      onContinue: () =>
        submitStep({
          validateInput: () =>
            password.password
              ? validate(passwordSchema, password)
              : { ok: true as const, data: null },
          action: async (data) => {
            if (data) {
              await savePasswordAction(data)
            } else {
              await skipPasswordAction()
            }
          },
          fallbackError: "Could not set your password.",
          onSuccess: () => advance("password"),
        }),
    },
    complete: {
      label: "Start your first scan",
      onContinue: () =>
        submitStep({
          action: () => completeOnboardingAction(),
          fallbackError: "Could not finish setting up your account.",
          onSuccess: () => router.replace(callbackUrl),
        }),
    },
  }

  const action = actionsByStep[step]

  return (
    <div className="w-full space-y-6">
      <OnboardingStepper
        sequence={sequence}
        currentStep={step}
        furthestStep={furthestStep}
        onNavigate={(next) => {
          setErrors({})
          goToStep(next)
        }}
        disabled={disabled}
      />

      <OnboardingCard>
        <OnboardingStepPanel stepKey={step}>
          <div className="space-y-6">
            <OnboardingStepHeading
              stepKey={step}
              title={STEP_TITLES[step]}
              description={definition.description}
            />

            {step === "welcome" ? (
              <WelcomeStep {...stepProps} consent={consent} onChange={setConsent} />
            ) : null}
            {step === "basics" ? (
              <BasicsStep {...stepProps} basics={basics} onChange={setBasics} />
            ) : null}
            {step === "skin_type" ? (
              <SkinTypeStep {...stepProps} skin={skinType} onChange={setSkinType} />
            ) : null}
            {step === "skin_concerns" ? (
              <SkinConcernsStep
                {...stepProps}
                skin={concerns}
                onChange={setConcerns}
              />
            ) : null}
            {step === "routine" ? (
              <RoutineStep {...stepProps} routine={routine} onChange={setRoutine} />
            ) : null}
            {step === "lifestyle" ? (
              <LifestyleStep
                {...stepProps}
                lifestyle={lifestyle}
                onChange={setLifestyle}
              />
            ) : null}
            {step === "location" ? (
              <LocationStep
                {...stepProps}
                location={location}
                onChange={setLocation}
                onDetect={detectLocation}
                detecting={locationDetecting}
                hint={locationHint}
              />
            ) : null}
            {step === "password" ? (
              <PasswordStep
                {...stepProps}
                password={password}
                onChange={setPassword}
              />
            ) : null}
            {step === "complete" ? (
              <CompleteStep
                skinType={skinType}
                concerns={concerns}
                location={location}
                freeScans={freeScans}
              />
            ) : null}

            {errors._ ? (
              <OnboardingStepItem>
                <p role="alert" className="text-destructive text-sm">
                  {errors._}
                </p>
              </OnboardingStepItem>
            ) : null}
          </div>
        </OnboardingStepPanel>
      </OnboardingCard>

      <OnboardingStepActions
        label={action.label}
        state={buttonState}
        canGoBack={previousStep !== null}
        showBack={step !== "welcome"}
        onBack={goBack}
        onContinue={action.onContinue}
        onSkip={definition.optional ? skipStep : undefined}
      />
    </div>
  )
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
