"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import type { Payment, BillingProfile, Prisma } from "@/generated/prisma/client"
import { requireSession } from "@/lib/auth/session"
import {
  billingProfileSchema,
  confirmPaymentSchema,
  confirmStripePaymentSchema,
  startCheckoutSchema,
} from "@/lib/billing/schemas"
import { prisma } from "@/lib/db/client"
import { sendReceiptEmail } from "@/lib/email/send-receipt"
import { getPaymentCurrency, getPaymentDriver } from "@/lib/payments"
import type { PaymentIntent } from "@/lib/payments/types"
import { nextReceiptNumber } from "@/lib/payments/receipt-number"
import { grantPackScans } from "@/lib/scans/balance"

type ActionError = { ok: false; error: string }
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ActionResult<T = {}> = ({ ok: true } & T) | ActionError

function revalidateBilling() {
  revalidatePath("/dashboard/billing")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/usage")
}

export async function saveBillingProfileAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = billingProfileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your billing details",
    }
  }

  const data = parsed.data
  await prisma.billingProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  })

  revalidatePath("/dashboard/billing")
  return { ok: true }
}

export type StartCheckoutResult = ActionResult<{
  paymentId: string
  amountCents: number
  currency: string
  scanCount: number
  packLabel: string
  provider: string
  /** Only set for gateways that confirm client-side (Stripe). */
  clientSecret?: string
}>

export async function startCheckoutAction(
  input: unknown,
): Promise<StartCheckoutResult> {
  const session = await requireSession()
  const parsed = startCheckoutSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Choose a pack to continue" }
  }

  const [pack, profile] = await Promise.all([
    prisma.scanPack.findUnique({ where: { id: parsed.data.packId } }),
    prisma.billingProfile.findUnique({ where: { userId: session.user.id } }),
  ])

  if (!pack || !pack.isActive) {
    return { ok: false, error: "That pack is no longer available" }
  }
  if (!profile) {
    return { ok: false, error: "Add your billing details before checking out" }
  }

  // Price always comes from the pack row, never from the client.
  const currency = getPaymentCurrency()
  const paymentId = randomUUID()
  const driver = getPaymentDriver()

  const intent = await driver.createIntent({
    paymentId,
    amountCents: pack.priceCents,
    currency,
    description: pack.label,
    customerEmail: profile.email,
    customerName: profile.fullName,
  })

  await prisma.$transaction(async (tx) => {
    const receiptNumber = await nextReceiptNumber(tx)
    await tx.payment.create({
      data: {
        id: paymentId,
        userId: session.user.id,
        packId: pack.id,
        provider: driver.id,
        providerRef: intent.ref,
        status: intent.status,
        amountCents: pack.priceCents,
        currency,
        tier: pack.tier,
        scanCount: pack.scanCount,
        receiptNumber,
      },
    })
  })

  return {
    ok: true,
    paymentId,
    amountCents: pack.priceCents,
    currency,
    scanCount: pack.scanCount,
    packLabel: pack.label,
    provider: driver.id,
    clientSecret: intent.clientSecret,
  }
}

export type ConfirmPaymentResult = ActionResult<{
  status: "succeeded" | "requires_action" | "failed"
  scanCount: number
  receiptNumber: string
}>

export async function confirmPaymentAction(
  input: unknown,
): Promise<ConfirmPaymentResult> {
  const session = await requireSession()
  const parsed = confirmPaymentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your card details",
    }
  }

  const { paymentId, card } = parsed.data
  const payment = await loadPayableOrThrow(paymentId, session.user.id)
  if ("result" in payment) return payment.result

  const driver = getPaymentDriver()
  const intent = await driver.confirmIntent({
    ref: payment.providerRef,
    amountCents: payment.amountCents,
    currency: payment.currency,
    card,
    previousStatus: payment.status,
  })

  return finalizePaymentIntent(payment, intent)
}

/**
 * For gateways that confirm client-side (Stripe): the browser already
 * confirmed the PaymentIntent via Stripe.js, this just re-reads the
 * authoritative status from the driver and grants scans if it succeeded.
 * The webhook handler performs the same finalize step independently, so
 * this is a fast-path for the UI, not the only source of truth.
 */
export async function confirmStripePaymentAction(
  input: unknown,
): Promise<ConfirmPaymentResult> {
  const session = await requireSession()
  const parsed = confirmStripePaymentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Payment not found" }
  }

  const payment = await loadPayableOrThrow(parsed.data.paymentId, session.user.id)
  if ("result" in payment) return payment.result

  if (payment.provider !== "stripe") {
    return { ok: false, error: "This payment is not a Stripe payment" }
  }

  const driver = getPaymentDriver()
  const intent = await driver.confirmIntent({
    ref: payment.providerRef,
    amountCents: payment.amountCents,
    currency: payment.currency,
    previousStatus: payment.status,
  })

  return finalizePaymentIntent(payment, intent)
}

/** Loads a payment the caller owns, short-circuiting terminal states. */
async function loadPayableOrThrow(
  paymentId: string,
  userId: string,
): Promise<Payment | { result: ConfirmPaymentResult }> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
  })

  if (!payment) {
    return { result: { ok: false, error: "Payment not found" } }
  }
  if (payment.status === "succeeded") {
    return {
      result: {
        ok: true,
        status: "succeeded",
        scanCount: payment.scanCount,
        receiptNumber: payment.receiptNumber,
      },
    }
  }
  if (payment.status === "refunded") {
    return { result: { ok: false, error: "This payment was refunded" } }
  }

  return payment
}

/**
 * Shared by confirmPaymentAction, confirmStripePaymentAction, and the Stripe
 * webhook handler. Idempotent: a compare-and-set on Payment.status ensures
 * only one caller ever grants scans for a given payment, no matter how many
 * times (client confirm + webhook, retries, ...) this runs for it.
 */
export async function finalizePaymentIntent(
  payment: Payment,
  intent: PaymentIntent,
): Promise<ConfirmPaymentResult> {
  const cardBrand = intent.cardBrand ?? null
  const cardLast4 = intent.cardLast4 ?? null

  if (intent.status !== "succeeded") {
    // Guard against an out-of-order webhook event (e.g. a stale
    // payment_intent.payment_failed arriving after payment_intent.succeeded
    // was already processed) downgrading a payment that already succeeded.
    await prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ["pending", "requires_action", "failed"] },
      },
      data: {
        status: intent.status,
        cardBrand,
        cardLast4,
        failureReason: intent.failureReason ?? null,
      },
    })

    revalidatePath("/dashboard/billing")
    return intent.status === "requires_action"
      ? {
          ok: true,
          status: "requires_action",
          scanCount: payment.scanCount,
          receiptNumber: payment.receiptNumber,
        }
      : { ok: false, error: failureMessage(intent.failureReason) }
  }

  const profile = await prisma.billingProfile.findUnique({
    where: { userId: payment.userId },
  })

  // Compare-and-set: only the attempt that flips the row to succeeded gets to
  // grant, so a double submit (or webhook racing the client confirm) can
  // never grant twice. "failed" is included because a Stripe PaymentIntent
  // can be retried with a new payment method after a decline and succeed on
  // the same intent — only "succeeded" and "refunded" are truly terminal
  // (both already short-circuited before this function is called).
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: { in: ["pending", "requires_action", "failed"] } },
    data: {
      status: "succeeded",
      paidAt: new Date(),
      cardBrand,
      cardLast4,
      failureReason: null,
      billingSnapshot: profile
        ? (toBillingSnapshot(profile) as Prisma.InputJsonValue)
        : undefined,
    },
  })

  if (claimed.count === 0) {
    return {
      ok: true,
      status: "succeeded",
      scanCount: payment.scanCount,
      receiptNumber: payment.receiptNumber,
    }
  }

  if (!payment.packId) {
    return { ok: false, error: "This payment is not linked to a pack" }
  }

  try {
    await grantPackScans({
      userId: payment.userId,
      packId: payment.packId,
      metadata: {
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber,
      },
    })
  } catch (error) {
    // Release the claim so the user can retry rather than paying for nothing.
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "pending",
        paidAt: null,
        failureReason: "grant_failed",
      },
    })
    console.error("Scan grant failed after payment", error)
    return { ok: false, error: "Payment went through but the scans could not be added. Try again." }
  }

  // Delivery is best-effort. The receipt is always downloadable from billing
  // history, so a bounced email must not fail a completed purchase.
  await sendReceiptEmail(payment.id, payment.userId)

  revalidateBilling()
  return {
    ok: true,
    status: "succeeded",
    scanCount: payment.scanCount,
    receiptNumber: payment.receiptNumber,
  }
}

function failureMessage(reason?: string | null): string {
  switch (reason) {
    case "card_declined":
      return "Your card was declined"
    case "insufficient_funds":
      return "Your card has insufficient funds"
    default:
      return "The payment could not be completed"
  }
}

function toBillingSnapshot(profile: BillingProfile) {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    country: profile.country,
    taxId: profile.taxId,
  }
}
