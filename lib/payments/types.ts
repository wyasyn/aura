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
  /**
   * Raw card fields, only used by drivers that take card data directly
   * (the mock driver). Real gateways confirm client-side via their own SDK
   * and this driver step just re-reads the authoritative status by `ref`.
   */
  card?: CardInput
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
  /**
   * Client secret for gateways that confirm the payment in the browser
   * (Stripe Elements). Never set by drivers that confirm server-side.
   */
  clientSecret?: string
}

export interface PaymentDriver {
  readonly id: PaymentProvider
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>
  confirmIntent(input: ConfirmIntentInput): Promise<PaymentIntent>
}
