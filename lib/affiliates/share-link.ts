/**
 * Share links for affiliates.
 *
 * Attribution in this system happens on the coupon code attached to a
 * WooCommerce order, not on the link someone clicked. The link is therefore a
 * convenience — it carries the code so the customer does not have to remember
 * it — and the code alone is what actually earns commission. That is why the
 * UI always shows the code next to the link rather than only the link.
 *
 * Whether ?coupon_code= applies automatically depends on the store's setup, so
 * nothing here promises it will. A customer who types the code at checkout is
 * always attributed correctly.
 */

export const COUPON_QUERY_PARAM = "coupon_code"

export function buildShareLink(
  storeUrl: string | null | undefined,
  couponCode: string | null | undefined,
): string | null {
  if (!storeUrl) return null

  // Only http(s) links are shareable. Anything else is malformed data rather
  // than something to hand a customer.
  let url: URL
  try {
    url = new URL(storeUrl)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null

  if (couponCode) {
    url.searchParams.set(COUPON_QUERY_PARAM, couponCode)
  }

  return url.toString()
}

/** Groups orders into calendar months for an earnings breakdown. */
export function monthlyEarnings(
  orders: { placedAt: Date; commissionAmountCents: number; status: string }[],
): { month: string; orders: number; commissionCents: number }[] {
  const buckets = new Map<string, { orders: number; commissionCents: number }>()

  for (const order of orders) {
    // Only confirmed orders have earned anything. Pending ones may still be
    // cancelled, and showing them as earnings would overstate what is owed.
    if (order.status !== "confirmed") continue

    const month = `${order.placedAt.getUTCFullYear()}-${String(
      order.placedAt.getUTCMonth() + 1,
    ).padStart(2, "0")}`

    const bucket = buckets.get(month) ?? { orders: 0, commissionCents: 0 }
    bucket.orders += 1
    bucket.commissionCents += order.commissionAmountCents
    buckets.set(month, bucket)
  }

  return [...buckets.entries()]
    .map(([month, totals]) => ({ month, ...totals }))
    .sort((a, b) => b.month.localeCompare(a.month))
}
