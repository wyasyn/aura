import { getTenantOrganizationIdSafe } from "@/lib/clinics/tenant"
import { prisma } from "@/lib/db/client"
import { getFreeStarterScans } from "@/lib/onboarding/constants"
import { grantScans } from "@/lib/scans/balance"

/**
 * Ties a brand-new account to the clinic whose site it was created on.
 *
 * Skipped for staff, who are already tied through their Member row, and never
 * overwrites an existing link — a patient belongs to the clinic they joined,
 * not the last one whose site they happened to load.
 */
async function linkNewUserToHostClinic(userId: string): Promise<void> {
  const organizationId = await getTenantOrganizationIdSafe()
  if (!organizationId) return

  const [existingLink, staffMembership] = await Promise.all([
    prisma.clinicPatient.findUnique({ where: { userId }, select: { id: true } }),
    prisma.member.findFirst({ where: { userId }, select: { id: true } }),
  ])
  if (existingLink || staffMembership) return

  try {
    await prisma.clinicPatient.create({ data: { userId, organizationId } })
  } catch (error) {
    // A concurrent sign-in may have created it first; the unique constraint on
    // userId makes that safe to ignore rather than fail the sign-in.
    console.warn("[auth] Could not link user to host clinic", error)
  }
}

export async function ensureUserRecords(userId: string, email: string, name?: string) {
  // Signing up on a clinic's site is how that clinic acquires a patient, and
  // this link is what later lets them back in — per-clinic isolation refuses
  // anyone with no tie to the site they are on. Created only when absent, so an
  // existing patient or a staff member is never re-pointed at another clinic.
  await linkNewUserToHostClinic(userId)

  await Promise.all([
    prisma.userProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.userLocation.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.scanBalance.upsert({
      where: { userId },
      create: { userId, remaining: 0 },
      update: {},
    }),
  ])

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase()
  const updates: Promise<unknown>[] = []

  if (bootstrapEmail && email.toLowerCase() === bootstrapEmail) {
    updates.push(
      prisma.user.update({
        where: { id: userId },
        data: { role: "admin" },
      }),
    )
  }

  if (name) {
    updates.push(
      prisma.user.update({
        where: { id: userId },
        data: { name },
      }),
    )
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }
}

export async function grantFreeStarterScansIfNeeded(userId: string) {
  const existing = await prisma.scanLedger.findFirst({
    where: { userId, reason: "signup_bonus" },
  })
  if (existing) return

  await grantScans({
    userId,
    amount: getFreeStarterScans(),
    reason: "signup_bonus",
    tier: "starter",
    metadata: { note: "Free Starter scans" },
  })
}
