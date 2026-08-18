/**
 * Clinic subscription entitlement.
 *
 * Statuses are persisted as the raw Stripe string (see
 * ClinicSettings.subscriptionStatus) rather than a Prisma enum, so a status
 * Stripe introduces later can never make a webhook write throw and retry
 * forever. Whether a status grants access is decided here instead.
 */

export const NO_SUBSCRIPTION = "none"

/**
 * Statuses that let a clinic serve its tenant.
 *
 * `past_due` is deliberately included: Stripe is still retrying the invoice at
 * that point, and taking a clinic's patient-facing site offline over a card
 * that will likely succeed on retry is worse than showing its admins a payment
 * warning. `unpaid` is where Stripe has given up, and that does cut access off.
 */
const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"])

/** Entitled, but needs attention — drives the billing warning banner. */
const GRACE_STATUSES = new Set(["past_due"])

const STATUS_LABELS: Record<string, string> = {
  none: "No subscription",
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment past due",
  unpaid: "Unpaid",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete",
  paused: "Paused",
}

/**
 * True when the subscription status permits serving the tenant. An unknown
 * status is treated as not entitled: we would rather a platform admin field a
 * support request than silently serve an unbilled tenant, and the raw value is
 * still stored so the situation is diagnosable.
 */
export function isSubscriptionEntitled(status: string): boolean {
  return ENTITLED_STATUSES.has(status)
}

export function isSubscriptionInGrace(status: string): boolean {
  return GRACE_STATUSES.has(status)
}

export function describeSubscriptionStatus(status: string): string {
  return STATUS_LABELS[status] ?? status
}

type ClinicGateInput = {
  status: "active" | "suspended"
  subscriptionStatus: string
}

export type ClinicAccess =
  | { ok: true; grace: boolean }
  | { ok: false; reason: "suspended" | "subscription" }

/**
 * Whether a clinic's tenant should be served at all. Suspension is checked
 * first because it is a deliberate platform-admin decision and should win over
 * whatever the billing state happens to be.
 */
export function resolveClinicAccess(clinic: ClinicGateInput): ClinicAccess {
  if (clinic.status === "suspended") {
    return { ok: false, reason: "suspended" }
  }
  if (!isSubscriptionEntitled(clinic.subscriptionStatus)) {
    return { ok: false, reason: "subscription" }
  }
  return { ok: true, grace: isSubscriptionInGrace(clinic.subscriptionStatus) }
}

type QuotaInput = {
  periodScanCount: number
  plan: { monthlyScanQuota: number } | null
}

export type QuotaState = {
  used: number
  limit: number | null
  remaining: number | null
  exhausted: boolean
}

/**
 * Scan quota for the current billing period. A clinic with no plan attached has
 * no allowance at all rather than an unlimited one — an unset plan is a
 * provisioning gap, and defaulting it open would give away metered work.
 */
export function resolveScanQuota({ periodScanCount, plan }: QuotaInput): QuotaState {
  if (!plan) {
    return { used: periodScanCount, limit: 0, remaining: 0, exhausted: true }
  }

  // A negative quota is the explicit "unlimited" encoding for bespoke
  // enterprise agreements that aren't metered.
  if (plan.monthlyScanQuota < 0) {
    return { used: periodScanCount, limit: null, remaining: null, exhausted: false }
  }

  const remaining = Math.max(0, plan.monthlyScanQuota - periodScanCount)
  return {
    used: periodScanCount,
    limit: plan.monthlyScanQuota,
    remaining,
    exhausted: remaining === 0,
  }
}
