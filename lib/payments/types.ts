import type { PaymentProvider, PaymentStatus } from "@/generated/prisma/client"

/** Card details as captured by the checkout form. Never persisted. */
export type CardInput = {
  number: string
  expiry: string
  cvc: string
  name: string
}

export type CreateIntentInput = {
  /** Internal Payment id, passed through so a driver can correlate webhooks. */
  paymentId: string
  amountCents: number
  currency: string
  description: string
  customerEmail: string
  customerName: string
}

export type ConfirmIntentInput = {
  ref: string
  amountCents: number
  currency: string
  card: CardInput
  /**
   * Status stored on the Payment row before this attempt. Lets a driver resolve
   * a multi-step flow without keeping in-process state.
   */
  previousStatus: PaymentStatus
}

export type PaymentIntent = {
  /** Provider-side identifier, stored as Payment.providerRef. */
  ref: string
  status: PaymentStatus
  amountCents: number
  currency: string
  cardBrand?: string
  cardLast4?: string
  /** Machine-readable code such as `card_declined`, absent when successful. */
  failureReason?: string
  /** Set when the provider needs the user redirected (3DS, mobile money prompt). */
  redirectUrl?: string
}

export interface PaymentDriver {
  readonly id: PaymentProvider
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>
  confirmIntent(input: ConfirmIntentInput): Promise<PaymentIntent>
}
