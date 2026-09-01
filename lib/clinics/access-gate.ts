import type { MembershipStatus } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

import type { ClinicAffiliation } from "@/lib/clinics/access-rules"

/** The rules these resolvers feed. Re-exported so importers need only this module. */
export * from "@/lib/clinics/access-rules"

/** Every membership and patient tie this account holds, in any state. */
export async function getAffiliationByUserId(
  userId: string,
): Promise<ClinicAffiliation | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      members: { select: { organizationId: true, role: true, status: true } },
      clinicPatient: { select: { organizationId: true } },
    },
  })
  if (!user) return null

  return {
    userId: user.id,
    role: user.role,
    memberships: user.members.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      status: m.status,
    })),
    patientOrganizationId: user.clinicPatient?.organizationId ?? null,
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
      members: { select: { organizationId: true, role: true, status: true } },
      clinicPatient: { select: { organizationId: true } },
    },
  })
  if (!user) return null

  return {
    userId: user.id,
    role: user.role,
    memberships: user.members.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      status: m.status,
    })),
    patientOrganizationId: user.clinicPatient?.organizationId ?? null,
  }
}
