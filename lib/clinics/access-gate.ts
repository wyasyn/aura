import { prisma } from "@/lib/db/client"

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

export type ClinicAffiliation = {
  userId: string
  role: string | null
  /** The clinic this account belongs to, or null for a platform account. */
  organizationId: string | null
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
  affiliation: Pick<ClinicAffiliation, "role" | "organizationId">,
  hostOrganizationId: string | null,
): AccessDecision {
  if (affiliation.role === "admin") {
    return { allowed: true }
  }

  if (hostOrganizationId) {
    if (affiliation.organizationId === hostOrganizationId) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: affiliation.organizationId ? "other_clinic" : "not_a_clinic_user",
    }
  }

  // Platform host.
  if (affiliation.organizationId) {
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

/** Staff membership takes precedence; a user should not have both. */
export async function getAffiliationByUserId(
  userId: string,
): Promise<ClinicAffiliation | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      members: { select: { organizationId: true }, take: 1 },
      clinicPatient: { select: { organizationId: true } },
    },
  })
  if (!user) return null

  return {
    userId: user.id,
    role: user.role,
    organizationId:
      user.members[0]?.organizationId ?? user.clinicPatient?.organizationId ?? null,
  }
}

export async function getAffiliationByEmail(
  email: string,
): Promise<ClinicAffiliation | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      role: true,
      members: { select: { organizationId: true }, take: 1 },
      clinicPatient: { select: { organizationId: true } },
    },
  })
  if (!user) return null

  return {
    userId: user.id,
    role: user.role,
    organizationId:
      user.members[0]?.organizationId ?? user.clinicPatient?.organizationId ?? null,
  }
}
