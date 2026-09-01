import { cache } from "react"
import { redirect } from "next/navigation"

import { normalizeRole } from "@/lib/auth/role"
import { resolveSession } from "@/lib/auth/resolve-session"
import type { Session } from "@/lib/auth/server"
import { decideAccess, getAffiliationByUserId } from "@/lib/clinics/access-gate"
import { getTenantSubdomainOrganizationId } from "@/lib/clinics/tenant"
import type { AppRole } from "@/lib/dashboard/nav"

/**
 * Whether this user's account belongs on the host the request arrived at.
 *
 * Fails open on an unexpected error: an outage in the lookup should log people
 * out of a working site, not silently, so the sign-in gate stays the primary
 * control and this stays a second line.
 */
async function sessionAllowedOnHost(userId: string): Promise<boolean> {
  try {
    const [affiliation, hostOrganizationId] = await Promise.all([
      getAffiliationByUserId(userId),
      getTenantSubdomainOrganizationId(),
    ])
    if (!affiliation) return true
    return decideAccess(affiliation, hostOrganizationId).allowed
  } catch (error) {
    console.error("[auth] Host access check failed; allowing session", error)
    return true
  }
}

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
    // Defence in depth behind the sign-in gate. A session minted before an
    // account was tied to a clinic, or one carried to another host, must not
    // keep working: treat it as signed out rather than trusting the cookie.
    const allowed = await sessionAllowedOnHost(result.session.user.id)
    if (!allowed) {
      return { kind: "guest" }
    }
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
