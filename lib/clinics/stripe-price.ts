import { getStripeClient } from "@/lib/payments/stripe/client"

/**
 * Keeps a plan's Stripe price in step with the price an admin typed.
 *
 * Stripe prices are immutable: the amount on a Price can never be changed. So
 * editing a plan's price in the admin UI cannot update the existing Price — a
 * new one has to be created and the plan pointed at it. Without this, an admin
 * could edit a plan to $99, see $99 everywhere in our UI, and have Stripe go on
 * charging the original amount at checkout.
 *
 * Returns null when Stripe is not configured, so a deployment without keys
 * still saves plans and simply cannot offer self-serve checkout.
 */
export async function createStripePriceForPlan(plan: {
  name: string
  description?: string | null
  priceCents: number
  interval: "month" | "year"
  currency?: string
}): Promise<string | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null

  // A free plan has nothing to charge for, and Stripe rejects a zero-amount
  // recurring price anyway.
  if (plan.priceCents <= 0) return null

  try {
    const price = await getStripeClient().prices.create({
      currency: (plan.currency ?? "usd").toLowerCase(),
      unit_amount: plan.priceCents,
      recurring: { interval: plan.interval },
      // Inline product creation, so plans need no separate product column and
      // each price carries a name that is legible in the Stripe dashboard.
      product_data: { name: `Aurora ${plan.name}` },
    })
    return price.id
  } catch (error) {
    // Surfaced to the caller rather than swallowed: an admin who changed a
    // price needs to know the change did not reach Stripe.
    throw new Error(
      `Saved the plan, but could not create its Stripe price: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    )
  }
}

/** Whether a saved edit needs a fresh Stripe price. */
export function stripePriceNeedsRefresh(
  previous: { priceCents: number; interval: string; stripePriceId: string | null } | null,
  next: { priceCents: number; interval: string },
): boolean {
  if (!previous) return true
  if (!previous.stripePriceId) return true
  return (
    previous.priceCents !== next.priceCents || previous.interval !== next.interval
  )
}
