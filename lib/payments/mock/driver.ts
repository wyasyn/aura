import { randomUUID } from "node:crypto"

import { getCardBrand, getCardLast4 } from "@/lib/payments/card-schema"
import { getTestCardOutcome } from "@/lib/payments/test-cards"
import type {
  ConfirmIntentInput,
  CreateIntentInput,
  PaymentDriver,
  PaymentIntent,
} from "@/lib/payments/types"

const DEFAULT_DELAY_MS = 800

function simulatedDelayMs(): number {
  const raw = Number(process.env.MOCK_PAYMENT_DELAY_MS)
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_DELAY_MS
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Stand-in for a real gateway. No network, no money. Outcomes are derived from
 * the card number, see lib/payments/test-cards.ts. Swap this out by adding a
 * sibling driver and pointing PAYMENT_PROVIDER at it.
 */
export const mockPaymentDriver: PaymentDriver = {
  id: "mock",

  async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    return {
      ref: `mock_pi_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
      status: "pending",
      amountCents: input.amountCents,
      currency: input.currency,
    }
  },

  async confirmIntent(input: ConfirmIntentInput): Promise<PaymentIntent> {
    await wait(simulatedDelayMs())

    const base = {
      ref: input.ref,
      amountCents: input.amountCents,
      currency: input.currency,
      cardBrand: getCardBrand(input.card.number),
      cardLast4: getCardLast4(input.card.number),
    }

    const outcome = getTestCardOutcome(input.card.number)

    switch (outcome) {
      case "declined":
        return { ...base, status: "failed", failureReason: "card_declined" }
      case "insufficient_funds":
        return {
          ...base,
          status: "failed",
          failureReason: "insufficient_funds",
        }
      case "requires_action":
        // First attempt asks for verification, the retry goes through.
        return input.previousStatus === "requires_action"
          ? { ...base, status: "succeeded" }
          : { ...base, status: "requires_action" }
      default:
        return { ...base, status: "succeeded" }
    }
  },
}
