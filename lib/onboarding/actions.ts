"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { revalidateUserScanContext } from "@/lib/ai/context/cache-tags"
import { auth } from "@/lib/auth/server"
import { grantFreeStarterScansIfNeeded } from "@/lib/auth/bootstrap"
import { requireSession } from "@/lib/auth/session"
import { shouldSyncClimate } from "@/lib/climate/sync"
import { refreshClimateForPlace } from "@/lib/climate/context"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import { reverseGeocode } from "@/lib/location/reverse-geocode"
import { getOnboardingContext } from "@/lib/onboarding/context"
import {
  CONSENT_VERSION,
  deriveAgeBand,
  type OnboardingStep,
} from "@/lib/onboarding/constants"
import {
  resolveNextStep,
  type OnboardingBranchState,
} from "@/lib/onboarding/steps"
import {
  basicsSchema,
  consentSchema,
  lifestyleSchema,
  locationSchema,
  passwordSchema,
  routineSchema,
  skinSchema,
} from "@/lib/onboarding/schemas"

export async function getOnboardingState() {
  const context = await getOnboardingContext()
  if (!context) {
    throw new Error("Unauthorized")
  }

  return {
    step: context.step,
    profile: context.profile,
    location: context.location,
    user: context.user,
  }
}

async function advanceStep(userId: string, step: OnboardingStep) {
  await withDbRetry(() =>
    prisma.userProfile.update({
      where: { userId },
      data: { onboardingStep: step },
    }),
  )
}

/** True when the account has no password credential yet. */
export async function userNeedsPassword(userId: string): Promise<boolean> {
  const credential = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  })
  return credential === null
}

/**
 * Reads the saved profile and works out which steps still apply.
 *
 * The step sequence branches on the user's own answers, so the server has to
 * resolve "next" from stored state rather than each action hardcoding a
 * successor. That is what keeps a resumed session and a live session in
 * agreement about where the user belongs.
 */
async function loadBranchState(userId: string): Promise<OnboardingBranchState> {
  const [profile, needsPassword] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { primaryConcerns: true, allergies: true },
    }),
    userNeedsPassword(userId),
  ])

  return {
    primaryConcerns: profile?.primaryConcerns ?? [],
    hasAllergies: Boolean(profile?.allergies?.trim()),
    needsPassword,
  }
}

/** Moves the stored pointer to the step after `current`, honouring branching. */
async function advanceToNextStep(userId: string, current: OnboardingStep) {
  const state = await loadBranchState(userId)
  await advanceStep(userId, resolveNextStep(current, state))
}

export async function resolveBrowserLocationAction(
  latitude: number,
  longitude: number,
) {
  await requireSession()

  const place = await reverseGeocode(latitude, longitude)
  if (!place) {
    return {
      ok: false as const,
      error:
        "Could not resolve your location. Enter your city and country manually.",
    }
  }

  return {
    ok: true as const,
    data: {
      city: place.city,
      region: place.region,
      country: place.country,
      latitude,
      longitude,
      locationSource: "geocode" as const,
    },
  }
}

export async function saveConsentAction(input: {
  photoProcessingConsent: boolean
  marketingConsent?: boolean
}) {
  const session = await requireSession()
  const parsed = consentSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      photoProcessingConsent: parsed.photoProcessingConsent,
      marketingConsent: parsed.marketingConsent ?? false,
      consentVersion: CONSENT_VERSION,
      consentAcceptedAt: new Date(),
    },
  })

  await advanceToNextStep(session.user.id, "welcome")
}

export async function saveBasicsAction(input: unknown) {
  const session = await requireSession()
  const data = basicsSchema.parse(input)
  const dateOfBirth = new Date(data.dateOfBirth)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: data.name },
  })

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      dateOfBirth,
      ageBand: deriveAgeBand(dateOfBirth),
      biologicalSex: data.biologicalSex,
    },
  })

  await advanceToNextStep(session.user.id, "basics")
  revalidateUserScanContext(session.user.id)
}

export async function saveSkinAction(
  input: unknown,
  currentStep: OnboardingStep = "skin_concerns",
) {
  const session = await requireSession()
  const data = skinSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      skinType: data.skinType ?? null,
      fitzpatrickBand: data.fitzpatrickBand ?? null,
      skinDosha: data.skinDosha ?? null,
      primaryConcerns: data.primaryConcerns,
      skinGoals: data.skinGoals,
      allergies: data.allergies ?? null,
      expertReviewRequested: data.expertReviewRequested ?? false,
    },
  })

  // Both skin steps write the same row; the caller passes which one it was so
  // branching resolves from the correct position.
  await advanceToNextStep(session.user.id, currentStep)
  revalidateUserScanContext(session.user.id)
}

export async function saveRoutineAction(input: unknown) {
  const session = await requireSession()
  const data = routineSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      currentRoutine: data.currentRoutine,
      previousPrescriptions: data.previousPrescriptions ?? [],
      medications: data.medications ?? [],
    },
  })

  await advanceToNextStep(session.user.id, "routine")
  revalidateUserScanContext(session.user.id)
}

export async function saveLifestyleAction(input: unknown) {
  const session = await requireSession()
  const data = lifestyleSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      lifestyleFactors: data.lifestyleFactors,
    },
  })

  await advanceToNextStep(session.user.id, "lifestyle")
  revalidateUserScanContext(session.user.id)
}

export async function saveLocationAction(input: unknown) {
  const session = await requireSession()
  const parsed = locationSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid location")
  }
  const data = parsed.data

  const hasLocation =
    Boolean(data.city || data.region || data.country) ||
    (data.latitude != null && data.longitude != null)

  if (hasLocation) {
    let climate = null
    let latitude = data.latitude
    let longitude = data.longitude

    try {
      const refreshed = await refreshClimateForPlace(data)
      if (refreshed) {
        climate = refreshed.climate
        latitude = refreshed.latitude
        longitude = refreshed.longitude
      }
    } catch {
      // Keep saved place even if weather lookup fails.
    }

    await prisma.userLocation.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        city: data.city ?? null,
        region: data.region ?? null,
        country: data.country ?? null,
        postalCode: data.postalCode ?? null,
        latitude,
        longitude,
        locationSource: data.locationSource,
        ...climate,
        lastSyncedAt: climate ? new Date() : undefined,
      },
      update: {
        city: data.city ?? null,
        region: data.region ?? null,
        country: data.country ?? null,
        postalCode: data.postalCode ?? null,
        latitude,
        longitude,
        locationSource: data.locationSource,
        ...climate,
        lastSyncedAt: climate ? new Date() : undefined,
      },
    })
  }

  await advanceToNextStep(session.user.id, "location")
  revalidateUserScanContext(session.user.id)
}

export async function syncUserClimateAction() {
  const session = await requireSession()
  const location = await prisma.userLocation.findUnique({
    where: { userId: session.user.id },
  })

  if (!location) {
    throw new Error("No location on file")
  }

  if (!shouldSyncClimate(location.lastSyncedAt)) {
    return location
  }

  const refreshed = await refreshClimateForPlace(location)
  if (!refreshed) {
    throw new Error("Could not resolve location for climate sync")
  }

  const updated = await prisma.userLocation.update({
    where: { userId: session.user.id },
    data: {
      ...refreshed.climate,
      latitude: refreshed.latitude,
      longitude: refreshed.longitude,
      lastSyncedAt: new Date(),
    },
  })

  revalidateUserScanContext(session.user.id)
  return updated
}

export async function savePasswordAction(input: unknown) {
  const session = await requireSession()
  const data = passwordSchema.parse(input)

  await auth.api.setPassword({
    body: { newPassword: data.password },
    headers: await headers(),
  })

  await advanceStep(session.user.id, "complete")
}

export async function skipPasswordAction() {
  const session = await requireSession()
  await advanceStep(session.user.id, "complete")
}

export async function completeOnboardingAction() {
  const session = await requireSession()

  await withDbRetry(() =>
    prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        onboardingCompletedAt: new Date(),
        onboardingStep: "complete",
      },
    }),
  )

  await withDbRetry(() =>
    prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true },
    }),
  )

  await grantFreeStarterScansIfNeeded(session.user.id)
  revalidatePath("/onboarding")
  revalidatePath("/scan")
  revalidatePath("/dashboard")
  revalidateUserScanContext(session.user.id)
}

/**
 * Marks that the user has seen the opening screen. Welcome and consent are one
 * step now, so this no longer advances the pointer on its own.
 */
export async function setWelcomeStepAction() {
  const session = await requireSession()
  await advanceStep(session.user.id, "welcome")
}

export async function skipToOnboardingStepAction(nextStep: OnboardingStep) {
  const session = await requireSession()
  await advanceStep(session.user.id, nextStep)
}
