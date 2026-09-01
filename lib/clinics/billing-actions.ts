"use server"

import { z } from "zod"

import { requireClinicManager } from "@/lib/clinics/membership"
import { clinicUrl } from "@/lib/clinics/subdomain"
import { requestOrigin } from "@/lib/clinics/request-origin"
import { prisma } from "@/lib/db/client"
import { getStripeClient } from "@/lib/payments/stripe/client"

const checkoutSchema = z.object({ planId: z.string().trim().min(1) })

/**
 * Starts a Stripe Checkout session for a clinic subscription.
 *
 * Uses Checkout rather than the embedded Payment Element the rest of the app
 * uses: this is a recurring subscription, which needs Stripe's own
 * subscription lifecycle and hosted payment-method management.
 */
export async function startClinicCheckoutAction(input: unknown) {
  const session = await requireClinicManager()
  const { planId } = checkoutSchema.parse(input)

  const plan = await prisma.clinicPlan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) {
    throw new Error("That plan is not available.")
  }
  if (!plan.stripePriceId) {
    throw new Error(
      "That plan has no Stripe price configured yet. Ask the Aurora team to finish setting it up.",
    )
  }

  const clinic = await prisma.clinicSettings.findUniqueOrThrow({
    where: { id: session.tenant.clinicId },
    select: { id: true, stripeCustomerId: true, displayName: true },
  })

  const stripe = getStripeClient()

  // Reuse the customer across plan changes so Stripe keeps one billing history
  // and one saved payment method per clinic.
  let customerId = clinic.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: clinic.displayName,
      metadata: { clinicId: clinic.id, subdomain: session.tenant.subdomain },
    })
    customerId = customer.id
    await prisma.clinicSettings.update({
      where: { id: clinic.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const billingUrl = clinicUrl(session.tenant.subdomain, "/clinic/billing", await requestOrigin())

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${billingUrl}?checkout=success`,
    cancel_url: `${billingUrl}?checkout=cancelled`,
    // Lets the webhook attribute the subscription even if the customer lookup
    // ever fails to match.
    subscription_data: {
      metadata: { clinicId: clinic.id, planId: plan.id },
    },
  })

  if (!checkout.url) {
    throw new Error("Stripe did not return a checkout URL. Please try again.")
  }
  return { url: checkout.url }
}

/** Opens Stripe's billing portal so a clinic can manage its own subscription. */
export async function openClinicBillingPortalAction() {
  const session = await requireClinicManager()

  const clinic = await prisma.clinicSettings.findUniqueOrThrow({
    where: { id: session.tenant.clinicId },
    select: { stripeCustomerId: true },
  })

  if (!clinic.stripeCustomerId) {
    throw new Error("This clinic has no Stripe billing set up yet.")
  }

  const portal = await getStripeClient().billingPortal.sessions.create({
    customer: clinic.stripeCustomerId,
    return_url: clinicUrl(session.tenant.subdomain, "/clinic/billing", await requestOrigin()),
  })

  return { url: portal.url }
}
