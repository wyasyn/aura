import { prisma } from "@/lib/db/client"
import { isSubscriptionEntitled } from "@/lib/clinics/subscription"

/**
 * Everything the platform holds for one clinic, for handover or a data-request
 * before the tenant is removed.
 *
 * Patient scans are included as metadata only. The assessment results and
 * images belong to the patient's own record, not the clinic's, and a clinic
 * offboarding is not a reason to hand over another party's medical detail.
 */
export async function buildClinicExport(clinicId: string) {
  const clinic = await prisma.clinicSettings.findUnique({
    where: { id: clinicId },
    include: {
      plan: true,
      organization: {
        include: {
          members: {
            include: { user: { select: { name: true, email: true } } },
          },
          invitations: true,
        },
      },
    },
  })

  if (!clinic) return null

  const scans = await prisma.scan.findMany({
    where: { organizationId: clinic.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      captureMode: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  })

  return {
    exportedAt: new Date().toISOString(),
    clinic: {
      id: clinic.id,
      subdomain: clinic.subdomain,
      displayName: clinic.displayName,
      status: clinic.status,
      supportEmail: clinic.supportEmail,
      branding: {
        logoUrl: clinic.logoUrl,
        primaryColor: clinic.primaryColor,
        accentColor: clinic.accentColor,
      },
      createdAt: clinic.createdAt.toISOString(),
    },
    organization: {
      id: clinic.organization.id,
      name: clinic.organization.name,
      slug: clinic.organization.slug,
    },
    subscription: {
      status: clinic.subscriptionStatus,
      planName: clinic.plan?.name ?? null,
      stripeCustomerId: clinic.stripeCustomerId,
      stripeSubscriptionId: clinic.stripeSubscriptionId,
      currentPeriodEnd: clinic.currentPeriodEnd?.toISOString() ?? null,
      periodScanCount: clinic.periodScanCount,
    },
    members: clinic.organization.members.map((member) => ({
      role: member.role,
      name: member.user.name,
      email: member.user.email,
      joinedAt: member.createdAt.toISOString(),
    })),
    pendingInvitations: clinic.organization.invitations
      .filter((invitation) => invitation.status === "pending")
      .map((invitation) => ({
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
      })),
    scans: scans.map((scan) => ({
      id: scan.id,
      status: scan.status,
      captureMode: scan.captureMode,
      createdAt: scan.createdAt.toISOString(),
      patientEmail: scan.user.email,
      patientName: scan.user.name,
    })),
  }
}

export type ClinicDeletionPreview = {
  subdomain: string
  displayName: string
  memberCount: number
  invitationCount: number
  /** Detached from the clinic, not deleted — see deleteClinic. */
  scanCount: number
  blockedReason: string | null
}

/**
 * What deleting a clinic would do, so the confirmation dialog can state the
 * consequences rather than asking the admin to take it on trust.
 */
export async function previewClinicDeletion(
  clinicId: string,
): Promise<ClinicDeletionPreview | null> {
  const clinic = await prisma.clinicSettings.findUnique({
    where: { id: clinicId },
    select: {
      subdomain: true,
      displayName: true,
      organizationId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
    },
  })
  if (!clinic) return null

  const [memberCount, invitationCount, scanCount] = await Promise.all([
    prisma.member.count({ where: { organizationId: clinic.organizationId } }),
    prisma.invitation.count({
      where: { organizationId: clinic.organizationId, status: "pending" },
    }),
    prisma.scan.count({ where: { organizationId: clinic.organizationId } }),
  ])

  return {
    subdomain: clinic.subdomain,
    displayName: clinic.displayName,
    memberCount,
    invitationCount,
    scanCount,
    blockedReason: deletionBlockedReason(clinic),
  }
}

/**
 * Deleting a tenant that Stripe is still billing would leave a subscription
 * charging a customer with nothing behind it, and no record here to reconcile
 * against. Cancelling billing is a deliberate separate decision.
 */
export function deletionBlockedReason(clinic: {
  stripeSubscriptionId: string | null
  subscriptionStatus: string
}): string | null {
  if (clinic.stripeSubscriptionId && isSubscriptionEntitled(clinic.subscriptionStatus)) {
    return "This clinic still has a live Stripe subscription. Cancel it in Stripe first, so it isn't billed for a tenant that no longer exists."
  }
  return null
}
