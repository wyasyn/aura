import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { resolveAuth } from "@/lib/auth/context"

type AuthShellGateProps = {
  children: ReactNode
  requireOnboarding?: boolean
  onboardingRedirect?: string
}

export async function AuthShellGate({
  children,
  requireOnboarding = true,
  onboardingRedirect = "/onboarding",
}: AuthShellGateProps) {
  const result = await resolveAuth()

  if (result.kind === "db_unavailable") {
    return <AuthUnavailable />
  }

  if (result.kind === "guest") {
    redirect("/login")
  }

  if (requireOnboarding && !result.context.onboardingCompleted) {
    redirect(onboardingRedirect)
  }

  return children
}

export async function getResolvedAuthContext() {
  const result = await resolveAuth()
  if (result.kind !== "authenticated") {
    return null
  }
  return result.context
}
