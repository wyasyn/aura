"use server"

import {
  DEFAULT_POST_ONBOARDING_PATH,
  safeCallbackPath,
} from "@/lib/auth/callback-url"
import { scheduleAiScanContextWarmup } from "@/lib/ai/context/warm"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export async function getPostAuthRedirect(
  userId: string,
  callbackUrl?: string | null,
): Promise<string> {
  const profile = await withDbRetry(() =>
    prisma.userProfile.findUnique({
      where: { userId },
      select: { onboardingCompletedAt: true },
    }),
  )

  scheduleAiScanContextWarmup(userId)

  const target = safeCallbackPath(callbackUrl, DEFAULT_POST_ONBOARDING_PATH)

  if (!profile?.onboardingCompletedAt) {
    return target === "/onboarding"
      ? "/onboarding"
      : `/onboarding?callbackUrl=${encodeURIComponent(target)}`
  }

  return target === "/onboarding" ? DEFAULT_POST_ONBOARDING_PATH : target
}
