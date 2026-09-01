/**
 * Pure access rules — no database, so the decision table can be tested
 * exhaustively without a connection.
 *
 * Split out of access-gate.ts, which keeps the Prisma-backed resolvers that
 * feed these and re-exports everything here, so existing imports are unchanged.
 */
import type { MembershipStatus } from "@/generated/prisma/client"

/**
 * Per-clinic login isolation.
 *
 * A person has one Aurora account, but that account belongs to exactly one
 * place: a clinic (as staff or patient), or the platform. Signing in anywhere
 * else is refused outright.
 *
 * The rules, in one place so the sign-in hook and the session check cannot
 * drift apart:
 *
 *   - Platform admins go anywhere. They administer every tenant, and locking
 *     them out of a clinic would make support impossible.
 *   - Someone affiliated with clinic X may sign in on clinic X only — not on
 *     another clinic, and not on the platform host.
 *   - Someone with no clinic affiliation may sign in on the platform only.
 */

/** One membership of one tenant, with the state that decides whether it counts. */
export type TenantMembership = {
  organizationId: string
  /** Tenant role: owner, admin, member. Distinct from the platform role. */
  role: string
  status: MembershipStatus
}

export type ClinicAffiliation = {
  userId: string
  /** Platform role. Global, and deliberately separate from any tenant role. */
  role: string | null
  /**
   * Every staff membership this account holds, in any state.
   *
   * A set, not a single value. This previously read `members[0]` behind
   * `take: 1`, which silently picked one clinic for a person who might belong
   * to several and refused them at every other one.
   */
  memberships: TenantMembership[]
  /** The clinic this account is a patient of. A user has at most one. */
  patientOrganizationId: string | null
}

/** Memberships that actually grant anything. Suspended and revoked do not. */
export function activeMemberships(a: ClinicAffiliation): TenantMembership[] {
  return a.memberships.filter((m) => m.status === "active")
}

/** The tenant role this account holds in one tenant, or null. */
export function tenantRoleIn(
  a: ClinicAffiliation,
  organizationId: string,
): string | null {
  return (
    activeMemberships(a).find((m) => m.organizationId === organizationId)?.role ??
    null
  )
}

/** Whether this account belongs to the given tenant at all, as staff or patient. */
export function belongsToTenant(
  a: ClinicAffiliation,
  organizationId: string,
): boolean {
  return (
    activeMemberships(a).some((m) => m.organizationId === organizationId) ||
    a.patientOrganizationId === organizationId
  )
}

/** True when the account is tied to any clinic, which bars it from the platform. */
export function hasAnyClinicTie(a: ClinicAffiliation): boolean {
  return activeMemberships(a).length > 0 || a.patientOrganizationId !== null
}

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: AccessDenialReason }

export type AccessDenialReason =
  /** Belongs to a different clinic than the one whose site this is. */
  | "other_clinic"
  /** Belongs to no clinic, so has no account at this clinic. */
  | "not_a_clinic_user"
  /** Belongs to a clinic, so cannot use the platform site. */
  | "clinic_user_on_platform"

export function decideAccess(
  affiliation: ClinicAffiliation,
  hostOrganizationId: string | null,
): AccessDecision {
  // Platform admins may sign in anywhere, so support can reach a tenant's
  // site. This is sign-in access only: it is emphatically not membership, and
  // resolveClinicSession still requires a real Member row before any tenant
  // data is read. Keep the two apart.
  if (affiliation.role === "admin") {
    return { allowed: true }
  }

  if (hostOrganizationId) {
    if (belongsToTenant(affiliation, hostOrganizationId)) {
      return { allowed: true }
    }
    // Someone whose only tie to this tenant is suspended or revoked is told
    // the same thing as a stranger — naming the difference would confirm that
    // an account exists here.
    return {
      allowed: false,
      reason: hasAnyClinicTie(affiliation) ? "other_clinic" : "not_a_clinic_user",
    }
  }

  // Platform host.
  if (hasAnyClinicTie(affiliation)) {
    return { allowed: false, reason: "clinic_user_on_platform" }
  }
  return { allowed: true }
}

/**
 * Messages are deliberately the same shape for every denial and never name the
 * clinic a person actually belongs to — that would let anyone with a login page
 * confirm which clinic treats a given patient.
 */
export function accessDenialMessage(reason: AccessDenialReason): string {
  switch (reason) {
    case "clinic_user_on_platform":
      return "This account belongs to a clinic. Please sign in on your clinic's own site."
    case "other_clinic":
    case "not_a_clinic_user":
      return "There is no account for this email at this clinic."
  }
}
