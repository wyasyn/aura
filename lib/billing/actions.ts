"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import type { BillingProfile, Prisma } from "@/generated/prisma/client"
import { requireSession } from "@/lib/auth/session"
import {
  billingProfileSchema,
  confirmPaymentSchema,
  startCheckoutSchema,
} from "@/lib/billing/schemas"
import { prisma } from "@/lib/db/client"
import { sendReceiptEmail } from "@/lib/email/send-receipt"
import { getPaymentCurrency, getPaymentDriver } from "@/lib/payments"
import { getCardBrand, getCardLast4 } from "@/lib/payments/card-schema"
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
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: session.user.id },
  })

  if (!payment) {
    return { ok: false, error: "Payment not found" }
  }
  if (payment.status === "succeeded") {
    return {
      ok: true,
      status: "succeeded",
      scanCount: payment.scanCount,
      receiptNumber: payment.receiptNumber,
    }
  }
  if (payment.status === "refunded") {
    return { ok: false, error: "This payment was refunded" }
  }

  const driver = getPaymentDriver()
  const intent = await driver.confirmIntent({
    ref: payment.providerRef,
    amountCents: payment.amountCents,
    currency: payment.currency,
    card,
    previousStatus: payment.status,
  })

  const cardBrand = getCardBrand(card.number)
  const cardLast4 = getCardLast4(card.number)

  if (intent.status !== "succeeded") {
    await prisma.payment.update({
      where: { id: payment.id },
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
    where: { userId: session.user.id },
  })

  // Compare-and-set: only the attempt that flips the row away from a payable
  // status gets to grant, so a double submit can never grant twice.
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: { in: ["pending", "requires_action"] } },
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
      userId: session.user.id,
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
  await sendReceiptEmail(payment.id, session.user.id)

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
