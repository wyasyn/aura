import type Stripe from "stripe"

import type { PaymentStatus } from "@/generated/prisma/client"
import { getStripeClient } from "@/lib/payments/stripe/client"
import type {
  ConfirmIntentInput,
  CreateIntentInput,
  PaymentDriver,
  PaymentIntent,
} from "@/lib/payments/types"

const KNOWN_BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
}

function cardBrandLabel(brand?: string | null): string | undefined {
  if (!brand) return undefined
  return KNOWN_BRANDS[brand] ?? brand
}

function mapStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case "succeeded":
      return "succeeded"
    case "requires_action":
      return "requires_action"
    case "requires_payment_method":
    case "canceled":
      return "failed"
    // requires_confirmation, requires_capture, processing: not final yet,
    // treat as pending and let the next retrieve/webhook resolve it.
    default:
      return "pending"
  }
}

function toPaymentIntent(pi: Stripe.PaymentIntent): PaymentIntent {
  const paymentMethod =
    typeof pi.payment_method === "object" && pi.payment_method !== null
      ? pi.payment_method
      : null
  const card = paymentMethod?.card

  return {
    ref: pi.id,
    status: mapStatus(pi.status),
    amountCents: pi.amount,
    currency: pi.currency.toUpperCase(),
    cardBrand: cardBrandLabel(card?.brand),
    cardLast4: card?.last4,
    failureReason: pi.last_payment_error?.code ?? undefined,
    clientSecret: pi.client_secret ?? undefined,
  }
}

/**
 * Confirmation happens in the browser via Stripe.js + the Payment Element —
 * raw card data must never reach our server (PCI scope). `confirmIntent`
 * here just re-reads the authoritative status from Stripe after the client
 * has confirmed; the webhook handler is the actual source of truth.
 */
export const stripePaymentDriver: PaymentDriver = {
  id: "stripe",

  async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    const stripe = getStripeClient()
    const pi = await stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      description: input.description,
      receipt_email: input.customerEmail,
      metadata: {
        paymentId: input.paymentId,
        customerName: input.customerName,
      },
      // Card only, matching the on-page card entry form (no redirect-based
      // wallets), so `redirect: "if_required"` never needs to leave the page.
      payment_method_types: ["card"],
    })
    return toPaymentIntent(pi)
  },

  async confirmIntent(input: ConfirmIntentInput): Promise<PaymentIntent> {
    const stripe = getStripeClient()
    const pi = await stripe.paymentIntents.retrieve(input.ref, {
      expand: ["payment_method"],
    })
    return toPaymentIntent(pi)
  },
}
