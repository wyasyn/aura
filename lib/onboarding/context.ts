import { cache } from "react"

import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import type { OnboardingStep } from "@/lib/onboarding/constants"

async function loadProfile(userId: string) {
  const existing = await withDbRetry(() =>
    prisma.userProfile.findUnique({
      where: { userId },
    }),
  )
  if (existing) return existing

  return withDbRetry(() =>
    prisma.userProfile.create({
      data: { userId },
    }),
  )
}

export const getOnboardingContext = cache(async () => {
  const session = await getSession()
  if (!session) return null

  const [profile, location] = await Promise.all([
    loadProfile(session.user.id),
    withDbRetry(() =>
      prisma.userLocation.findUnique({
        where: { userId: session.user.id },
      }),
    ),
  ])

  return {
    session,
    user: session.user,
    profile,
    location,
    step: profile.onboardingStep as OnboardingStep,
    completed: Boolean(profile.onboardingCompletedAt),
  }
})
