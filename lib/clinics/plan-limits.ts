/**
 * Plan limits, where -1 means unlimited.
 *
 * Scans already used that convention; seats did not, and the schema forbade
 * anything below 1, so an unmetered agreement could not be expressed at all.
 * Both now share one encoding, and every place that reads or displays a limit
 * goes through here so the meaning cannot drift between them.
 */

export const UNLIMITED = -1

export function isUnlimited(limit: number): boolean {
  return limit < 0
}

/** True when adding one more would exceed the plan. Unlimited never does. */
export function wouldExceedLimit(limit: number, current: number): boolean {
  if (isUnlimited(limit)) return false
  return current >= limit
}

export function formatLimit(limit: number): string {
  return isUnlimited(limit) ? "Unlimited" : String(limit)
}

export function formatSeats(limit: number): string {
  if (isUnlimited(limit)) return "Unlimited seats"
  return `${limit} seat${limit === 1 ? "" : "s"}`
}

export function formatScanQuota(limit: number): string {
  if (isUnlimited(limit)) return "Unlimited scans"
  return `${limit} scans / month`
}
