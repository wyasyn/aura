import { prisma } from "@/lib/db/client"
import { resolveClinicAccess, resolveScanQuota } from "@/lib/clinics/subscription"

export async function listClinics() {
  const clinics = await prisma.clinicSettings.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
          _count: { select: { members: true, scans: true } },
        },
      },
      plan: {
        select: {
          id: true,
          name: true,
          seatLimit: true,
          monthlyScanQuota: true,
        },
      },
    },
  })

  return clinics.map((clinic) => ({
    id: clinic.id,
    organizationId: clinic.organizationId,
    name: clinic.organization.name,
    subdomain: clinic.subdomain,
    displayName: clinic.displayName,
    status: clinic.status,
    subscriptionStatus: clinic.subscriptionStatus,
    currentPeriodEnd: clinic.currentPeriodEnd,
    stripeSubscriptionId: clinic.stripeSubscriptionId,
    plan: clinic.plan,
    memberCount: clinic.organization._count.members,
    totalScanCount: clinic.organization._count.scans,
    access: resolveClinicAccess({
      status: clinic.status,
      subscriptionStatus: clinic.subscriptionStatus,
    }),
    quota: resolveScanQuota({
      periodScanCount: clinic.periodScanCount,
      plan: clinic.plan,
    }),
    createdAt: clinic.createdAt,
  }))
}

export type AdminClinicRow = Awaited<ReturnType<typeof listClinics>>[number]

export async function listClinicPlans() {
  return prisma.clinicPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })
}

/** Plans offered to a clinic at checkout — active ones with a Stripe price. */
export async function listPurchasableClinicPlans() {
  return prisma.clinicPlan.findMany({
    where: { isActive: true, stripePriceId: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
  })
}

/**
 * Platform-administration reads for one clinic.
 *
 * These take a plain organizationId rather than a TenantScope, deliberately.
 * A TenantScope can only be minted by resolving a membership, and a platform
 * administrator is not a member of the clinic they are administering — that
 * separation is the whole point of the Phase 2 rule. Minting a scope for them
 * would erase the distinction between "member of this tenant" and "operator of
 * this platform".
 *
 * The safety therefore comes from the other flow: the caller must have passed
 * requireAdmin(), the tenant is named explicitly, and every query below filters
 * by it. Nothing here reads across tenants.
 */

/** Membership counts by status, in one grouped query rather than four counts. */
export async function getClinicMembershipCounts(organizationId: string) {
  const [byStatus, pendingInvites] = await Promise.all([
    prisma.member.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.invitation.count({ where: { organizationId, status: "pending" } }),
  ])

  const counts = { active: 0, invited: 0, suspended: 0, revoked: 0 }
  for (const row of byStatus) {
    counts[row.status] = row._count._all
  }

  return {
    ...counts,
    pendingInvites,
    /** Only live memberships hold a seat; see SEAT_CONSUMING_STATUSES. */
    seatsUsed: counts.active + counts.invited + pendingInvites,
  }
}

/**
 * Members of one clinic, for the admin control plane.
 *
 * Unlike the tenant-facing listClinicMembers, this includes revoked
 * memberships: the record of who once had access is exactly what an
 * administrator investigating a clinic needs to see.
 */
export async function listClinicMembersForAdmin(organizationId: string) {
  const members = await prisma.member.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return members.map((member) => ({
    id: member.id,
    role: member.role,
    status: member.status,
    joinedAt: member.createdAt,
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
  }))
}

export type AdminClinicMemberRow = Awaited<
  ReturnType<typeof listClinicMembersForAdmin>
>[number]

/**
 * One clinic's control-plane record.
 *
 * Counts come from relation aggregates rather than by loading rows: an
 * administrator needs to know a clinic has 400 patients, not who they are.
 * Returns null for an unknown organization so the caller can 404 rather than
 * confirming which identifiers exist.
 */
export async function getClinicDetail(organizationId: string) {
  const clinic = await prisma.clinicSettings.findUnique({
    where: { organizationId },
    include: {
      organization: {
        select: {
          name: true,
          createdAt: true,
          _count: { select: { members: true, scans: true, patients: true, bookings: true } },
        },
      },
      plan: {
        select: { id: true, name: true, priceCents: true, currency: true, interval: true, seatLimit: true, monthlyScanQuota: true },
      },
    },
  })

  if (!clinic) return null

  return {
    organizationId: clinic.organizationId,
    name: clinic.organization.name,
    displayName: clinic.displayName,
    subdomain: clinic.subdomain,
    customDomain: clinic.customDomain,
    customDomainVerified: Boolean(clinic.customDomainVerifiedAt),
    status: clinic.status,
    subscriptionStatus: clinic.subscriptionStatus,
    currentPeriodEnd: clinic.currentPeriodEnd,
    cancelAtPeriodEnd: clinic.cancelAtPeriodEnd,
    stripeSubscriptionId: clinic.stripeSubscriptionId,
    plan: clinic.plan,
    createdAt: clinic.organization.createdAt,
    allowTrainingContribution: clinic.allowTrainingContribution,
    counts: {
      members: clinic.organization._count.members,
      patients: clinic.organization._count.patients,
      scans: clinic.organization._count.scans,
      appointments: clinic.organization._count.bookings,
    },
    quota: resolveScanQuota({
      periodScanCount: clinic.periodScanCount,
      plan: clinic.plan,
    }),
    access: resolveClinicAccess({
      status: clinic.status,
      subscriptionStatus: clinic.subscriptionStatus,
    }),
  }
}

export type AdminClinicDetail = NonNullable<Awaited<ReturnType<typeof getClinicDetail>>>

/** Platform-wide clinic totals for the admin dashboard. */
export async function getClinicSummary() {
  const [byStatus, plans, totalMembers, withSubscription] = await Promise.all([
    prisma.clinicSettings.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.clinicSettings.groupBy({
      by: ["planId"],
      _count: { _all: true },
    }),
    prisma.member.count({ where: { status: { in: ["active", "invited"] } } }),
    prisma.clinicSettings.count({ where: { subscriptionStatus: "active" } }),
  ])

  const statusCounts = { active: 0, suspended: 0 }
  for (const row of byStatus) statusCounts[row.status] = row._count._all

  return {
    total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
    active: statusCounts.active,
    suspended: statusCounts.suspended,
    unplanned: plans.find((p) => p.planId === null)?._count._all ?? 0,
    activeSubscriptions: withSubscription,
    liveMemberships: totalMembers,
  }
}
