import type Stripe from "stripe"

import { prisma } from "@/lib/db/client"

/**
 * Applies a Stripe subscription to the clinic that owns it.
 *
 * Written to be safe to run repeatedly and out of order: Stripe delivers
 * subscription events with no ordering guarantee and retries on any non-2xx, so
 * a late `updated` for an older state must not clobber a newer one. The guard
 * below drops any event whose subscription state is older than what we stored.
 */
export async function syncClinicSubscription(
  subscription: Stripe.Subscription,
): Promise<{ handled: boolean; reason?: string }> {
  const clinic = await prisma.clinicSettings.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        // First event for a brand-new subscription arrives before we've stored
        // its id, so fall back to the customer we created at checkout.
        { stripeCustomerId: subscriptionCustomerId(subscription) ?? "__none__" },
      ],
    },
    select: { id: true, currentPeriodEnd: true, planId: true },
  })

  if (!clinic) {
    return { handled: false, reason: "no_clinic_for_subscription" }
  }

  const periodEnd = subscriptionPeriodEnd(subscription)

  // Out-of-order guard: only skip when this event is strictly older than what
  // we have. Equal timestamps still apply, since status can change within the
  // same billing period (active -> past_due).
  if (
    clinic.currentPeriodEnd &&
    periodEnd &&
    periodEnd.getTime() < clinic.currentPeriodEnd.getTime()
  ) {
    return { handled: false, reason: "stale_event" }
  }

  const planId = await resolvePlanId(subscription, clinic.planId)

  await prisma.clinicSettings.update({
    where: { id: clinic.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscriptionCustomerId(subscription) ?? undefined,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      planId,
      // A new billing period resets metered usage. Compared on the period end
      // so a renewal resets exactly once, however many events describe it.
      ...(periodEnd &&
      clinic.currentPeriodEnd &&
      periodEnd.getTime() > clinic.currentPeriodEnd.getTime()
        ? { periodScanCount: 0, periodStartedAt: new Date() }
        : {}),
    },
  })

  return { handled: true }
}

function subscriptionCustomerId(subscription: Stripe.Subscription): string | null {
  const { customer } = subscription
  if (!customer) return null
  return typeof customer === "string" ? customer : customer.id
}

/**
 * Stripe moved the period boundary onto subscription items; older API versions
 * expose it on the subscription itself. Read both so this keeps working across
 * an API version bump rather than silently storing null.
 */
function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end
  const fromSubscription = (subscription as unknown as { current_period_end?: number })
    .current_period_end

  const seconds = fromItem ?? fromSubscription
  return typeof seconds === "number" ? new Date(seconds * 1000) : null
}

/** Maps the subscribed Stripe price back to one of our plans. */
async function resolvePlanId(
  subscription: Stripe.Subscription,
  currentPlanId: string | null,
): Promise<string | null> {
  const priceId = subscription.items?.data?.[0]?.price?.id
  if (!priceId) return currentPlanId

  const plan = await prisma.clinicPlan.findUnique({
    where: { stripePriceId: priceId },
    select: { id: true },
  })

  // Keep whatever an admin assigned rather than nulling the plan out just
  // because the price isn't one we recognize.
  return plan?.id ?? currentPlanId
}
