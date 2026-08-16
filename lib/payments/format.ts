/**
 * Formats a customer-facing amount. Internal provider cost formatting lives in
 * lib/pricing/format-cost.ts and uses micro-USD, a different unit.
 */
export function formatMoneyCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100)
}
