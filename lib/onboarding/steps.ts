import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/lib/onboarding/constants"

/**
 * The subset of answers that decides which steps are asked.
 *
 * Kept deliberately small: branching should depend on a couple of clear
 * signals, not on the whole form.
 */
export type OnboardingBranchState = {
  primaryConcerns: string[]
  hasAllergies: boolean
  /** True when the account has no password credential yet. */
  needsPassword: boolean
}

export const EMPTY_BRANCH_STATE: OnboardingBranchState = {
  primaryConcerns: [],
  hasAllergies: false,
  needsPassword: true,
}

/**
 * Concerns for which asking about an existing routine and prescriptions is
 * worth the extra screen. Someone here for general upkeep should not be asked
 * to list medications.
 */
const ROUTINE_RELEVANT_CONCERNS = new Set([
  "acne",
  "aging",
  "hyperpigmentation",
  "sensitivity",
  "redness",
])

export type OnboardingStepDefinition = {
  id: OnboardingStep
  label: string
  /** Shown under the title. */
  description?: string
  /** Whether the step offers a skip affordance. */
  optional: boolean
  /** Whether this step is asked at all, given what the user has answered. */
  isRelevant: (state: OnboardingBranchState) => boolean
}

export const ONBOARDING_STEP_DEFINITIONS: OnboardingStepDefinition[] = [
  {
    id: "welcome",
    label: "Welcome",
    optional: false,
    isRelevant: () => true,
  },
  {
    id: "basics",
    label: "About you",
    description: "Your age band helps us read the photo in context.",
    optional: false,
    isRelevant: () => true,
  },
  {
    id: "skin_type",
    label: "Your skin",
    description: "How your skin usually behaves, and how it reacts to sun.",
    optional: true,
    isRelevant: () => true,
  },
  {
    id: "skin_concerns",
    label: "Focus",
    description: "What you would most like to work on.",
    optional: true,
    isRelevant: () => true,
  },
  {
    id: "routine",
    label: "Routine",
    description: "What you already use, so recommendations build on it.",
    optional: true,
    // Only worth asking when a concern suggests an existing regimen.
    isRelevant: (state) =>
      state.primaryConcerns.some((concern) =>
        ROUTINE_RELEVANT_CONCERNS.has(concern),
      ),
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "Habits that show up on skin.",
    optional: true,
    isRelevant: () => true,
  },
  {
    id: "location",
    label: "Climate",
    description: "So guidance matches the weather you actually live in.",
    optional: true,
    isRelevant: () => true,
  },
  {
    id: "password",
    label: "Security",
    description: "Optional. You can always sign in with an email code.",
    optional: true,
    isRelevant: (state) => state.needsPassword,
  },
  {
    id: "complete",
    label: "Finish",
    optional: false,
    isRelevant: () => true,
  },
]

const DEFINITION_BY_ID = new Map(
  ONBOARDING_STEP_DEFINITIONS.map((definition) => [definition.id, definition]),
)

export function getStepDefinition(
  step: OnboardingStep,
): OnboardingStepDefinition {
  const definition = DEFINITION_BY_ID.get(step)
  if (!definition) {
    throw new Error(`Unknown onboarding step: ${step}`)
  }
  return definition
}

/** The steps actually asked, in order, for a given set of answers. */
export function resolveStepSequence(
  state: OnboardingBranchState,
): OnboardingStep[] {
  return ONBOARDING_STEP_DEFINITIONS.filter((definition) =>
    definition.isRelevant(state),
  ).map((definition) => definition.id)
}

/**
 * The step after `current`, skipping any the answers made irrelevant.
 *
 * Both the client and the server actions resolve "next" through this, so a
 * resumed session and a live session agree on where the user belongs.
 */
export function resolveNextStep(
  current: OnboardingStep,
  state: OnboardingBranchState,
): OnboardingStep {
  const sequence = resolveStepSequence(state)
  const index = sequence.indexOf(current)

  if (index === -1) {
    // The current step was branched away. Fall back to the next step that is
    // still relevant, using the canonical order.
    const canonicalIndex = ONBOARDING_STEPS.indexOf(current)
    const next = sequence.find(
      (step) => ONBOARDING_STEPS.indexOf(step) > canonicalIndex,
    )
    return next ?? "complete"
  }

  return sequence[index + 1] ?? "complete"
}

export function resolvePreviousStep(
  current: OnboardingStep,
  state: OnboardingBranchState,
): OnboardingStep | null {
  const sequence = resolveStepSequence(state)
  const index = sequence.indexOf(current)
  if (index <= 0) return null
  return sequence[index - 1] ?? null
}

/**
 * Maps step ids stored before the flow was restructured onto their current
 * equivalents, so an account mid-onboarding resumes rather than restarting.
 */
const LEGACY_STEP_ALIASES: Record<string, OnboardingStep> = {
  consent: "welcome",
  skin: "skin_type",
}

export function normalizeStoredStep(value: string | null | undefined): OnboardingStep {
  if (!value) return "welcome"
  if (ONBOARDING_STEPS.includes(value as OnboardingStep)) {
    return value as OnboardingStep
  }
  return LEGACY_STEP_ALIASES[value] ?? "welcome"
}
