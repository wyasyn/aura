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
