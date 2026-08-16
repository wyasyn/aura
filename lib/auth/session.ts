import { cache } from "react"
import { redirect } from "next/navigation"

import { getAuthContext } from "@/lib/auth/context"
import { resolveSession } from "@/lib/auth/resolve-session"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export const getSession = cache(async () => {
  const result = await resolveSession()
  if (result.status === "ok") {
    return result.session
  }
  return null
})

export async function requireSession() {
  const ctx = await getAuthContext()
  if (!ctx) {
    redirect("/login")
  }
  return ctx.session
}

export async function requireRole(roles: string[]) {
  const ctx = await getAuthContext()
  if (!ctx) {
    redirect("/login")
  }
  if (!roles.includes(ctx.role)) {
    redirect("/dashboard")
  }
  return ctx.session
}

export async function requireAdmin() {
  return requireRole(["admin"])
}

export const getOnboardingStatus = cache(async (userId: string) => {
  const profile = await withDbRetry(() =>
    prisma.userProfile.findUnique({
      where: { userId },
      select: { onboardingCompletedAt: true, onboardingStep: true },
    }),
  )

  return {
    completed: Boolean(profile?.onboardingCompletedAt),
    step: profile?.onboardingStep ?? "welcome",
  }
})

export async function requireOnboardingComplete() {
  const ctx = await getAuthContext()
  if (!ctx) {
    redirect("/login")
  }
  if (!ctx.onboardingCompleted) {
    redirect("/onboarding")
  }
  return ctx.session
}
