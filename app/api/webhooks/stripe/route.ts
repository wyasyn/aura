import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { finalizePaymentIntent } from "@/lib/billing/actions"
import { syncClinicSubscription } from "@/lib/clinics/subscription-sync"
import { prisma } from "@/lib/db/client"
import { finalizeBookingIntent } from "@/lib/experts/booking-actions"
import { toPaymentStatus } from "@/lib/experts/payment-status"
import { getPaymentDriver } from "@/lib/payments"
import { getStripeClient } from "@/lib/payments/stripe/client"

/**
 * Authoritative confirmation path. The client also confirms via
 * confirmStripePaymentAction right after Stripe.js resolves, but that's a
 * fast-path for the UI only — a closed tab or a network drop after payment
 * must not leave a paid Payment row stuck at "pending", so this webhook is
 * the source of truth. finalizePaymentIntent's compare-and-set makes running
 * both paths for the same payment safe.
 */
const HANDLED_EVENTS = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
])

/**
 * Clinic subscriptions (see lib/clinics/subscription-sync.ts). These carry a
 * Subscription rather than a PaymentIntent, so they're dispatched separately
 * from the one-off payment path below.
 */
const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
])

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    const subscription = event.data.object as Stripe.Subscription
    const result = await syncClinicSubscription(subscription)
    if (!result.handled) {
      console.warn(
        `Stripe webhook: subscription ${subscription.id} not applied (${result.reason})`,
      )
    }
    return NextResponse.json({ ok: true, ...result })
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ ok: true, skipped: event.type })
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const driver = getPaymentDriver()

  // Scan-pack purchases and consultation bookings are tracked in separate
  // tables (see lib/experts/booking-actions.ts for why), so check both.
  const payment = await prisma.payment.findUnique({
    where: { providerRef: paymentIntent.id },
  })

  if (payment) {
    const intent = await driver.confirmIntent({
      ref: paymentIntent.id,
      amountCents: payment.amountCents,
      currency: payment.currency,
      previousStatus: payment.status,
    })

    const result = await finalizePaymentIntent(payment, intent)
    if (!result.ok) {
      console.error(
        `Stripe webhook: finalize failed for payment ${payment.id}`,
        result.error,
      )
    }
    return NextResponse.json({ ok: true })
  }

  const booking = await prisma.booking.findUnique({
    where: { paymentRef: paymentIntent.id },
  })

  if (booking) {
    const intent = await driver.confirmIntent({
      ref: paymentIntent.id,
      amountCents: booking.amountCents,
      currency: booking.currency,
      previousStatus: toPaymentStatus(booking.status),
    })

    const result = await finalizeBookingIntent(booking, intent)
    if (!result.ok) {
      console.error(
        `Stripe webhook: finalize failed for booking ${booking.id}`,
        result.error,
      )
    }
    return NextResponse.json({ ok: true })
  }

  console.warn(`Stripe webhook: no Payment or Booking row for ${paymentIntent.id}`)
  return NextResponse.json({ ok: true, skipped: "unknown_payment" })
}
