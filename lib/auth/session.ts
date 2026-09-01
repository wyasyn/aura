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

/** Approved ExpertProfile rather than role, for the reason given on requireAffiliate. */
export async function requireExpert() {
  const ctx = await getAuthContext()
  if (!ctx) {
    redirect("/login")
  }

  if (ctx.role !== "expert") {
    const approved = await withDbRetry(() =>
      prisma.expertProfile.findFirst({
        where: { userId: ctx.userId, status: "approved" },
        select: { id: true },
      }),
    )
    if (!approved) {
      redirect("/dashboard/expert-application")
    }
  }

  return ctx.session
}

/**
 * An approved AffiliateProfile is what makes someone an affiliate, not the role
 * field — role holds a single value, so an admin or clinic manager who is also
 * in the programme would otherwise be turned away from their own referral data.
 *
 * This is still a backend check and it is still narrow: every affiliate query
 * downstream is scoped to the returned session's own user id, so passing here
 * grants sight of nothing but the caller's own earnings.
 */
export async function requireAffiliate() {
  const ctx = await getAuthContext()
  if (!ctx) {
    redirect("/login")
  }

  if (ctx.role !== "affiliate") {
    const approved = await withDbRetry(() =>
      prisma.affiliateProfile.findFirst({
        where: { userId: ctx.userId, status: "approved" },
        select: { id: true },
      }),
    )
    if (!approved) {
      redirect("/dashboard/affiliate-application")
    }
  }

  return ctx.session
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
