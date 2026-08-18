import { ClinicBilling } from "@/components/clinics/clinic-billing"
import { listPurchasableClinicPlans } from "@/lib/admin/clinic-queries"
import { canManageClinic, requireClinicMember } from "@/lib/clinics/membership"
import { describeSubscriptionStatus } from "@/lib/clinics/subscription"
import { prisma } from "@/lib/db/client"

export async function ClinicBillingLoader() {
  const session = await requireClinicMember()
  const { tenant } = session

  const [plans, clinic] = await Promise.all([
    listPurchasableClinicPlans(),
    prisma.clinicSettings.findUniqueOrThrow({
      where: { id: tenant.clinicId },
      select: { stripeCustomerId: true, cancelAtPeriodEnd: true },
    }),
  ])

  return (
    <ClinicBilling
      statusLabel={describeSubscriptionStatus(tenant.subscriptionStatus)}
      entitled={tenant.access.ok}
      inGrace={tenant.access.ok && tenant.access.grace}
      cancelAtPeriodEnd={clinic.cancelAtPeriodEnd}
      hasStripeCustomer={Boolean(clinic.stripeCustomerId)}
      canManage={canManageClinic(session.role)}
      currentPeriodEnd={
        tenant.currentPeriodEnd
          ? tenant.currentPeriodEnd.toLocaleDateString(undefined, {
              dateStyle: "medium",
            })
          : null
      }
      plans={plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        interval: plan.interval,
        seatLimit: plan.seatLimit,
        monthlyScanQuota: plan.monthlyScanQuota,
        isCurrent: plan.id === tenant.plan?.id,
      }))}
    />
  )
}
