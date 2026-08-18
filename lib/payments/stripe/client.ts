import Stripe from "stripe"

let cached: Stripe | null = null

export function getStripeClient(): Stripe {
  if (cached) return cached

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local and set PAYMENT_PROVIDER=stripe.",
    )
  }

  cached = new Stripe(key)
  return cached
}
