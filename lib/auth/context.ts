import { cache } from "react"
import { redirect } from "next/navigation"

import { normalizeRole } from "@/lib/auth/role"
import { resolveSession } from "@/lib/auth/resolve-session"
import type { Session } from "@/lib/auth/server"
import type { AppRole } from "@/lib/dashboard/nav"

export type AuthContext = {
  session: Session
  user: Session["user"]
  userId: string
  role: AppRole
  onboardingCompleted: boolean
}

export type AuthResolveResult =
  | { kind: "authenticated"; context: AuthContext }
  | { kind: "guest" }
  | { kind: "db_unavailable" }

function toAuthContext(session: Session): AuthContext {
  return {
    session,
    user: session.user,
    userId: session.user.id,
    role: normalizeRole(session.user.role),
    onboardingCompleted: Boolean(session.user.onboardingCompleted),
  }
}

export const resolveAuth = cache(async (): Promise<AuthResolveResult> => {
  const result = await resolveSession()

  if (result.status === "ok") {
    return { kind: "authenticated", context: toAuthContext(result.session) }
  }

  if (result.status === "db_unavailable") {
    return { kind: "db_unavailable" }
  }

  return { kind: "guest" }
})

/** Single per-request auth loader — session, role, and onboarding gate from cached session. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const result = await resolveAuth()
  if (result.kind === "authenticated") {
    return result.context
  }
  return null
})

/** Defensive redirect for pages/actions that need a guaranteed context. */
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) {
    redirect("/login")
  }
  return ctx
}
