import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  isSubscriptionEntitled,
  isSubscriptionInGrace,
  resolveClinicAccess,
  resolveScanQuota,
} from "@/lib/clinics/subscription"

describe("isSubscriptionEntitled", () => {
  it("entitles active and trialing clinics", () => {
    assert.equal(isSubscriptionEntitled("active"), true)
    assert.equal(isSubscriptionEntitled("trialing"), true)
  })

  it("keeps a past_due clinic serving while Stripe retries", () => {
    assert.equal(isSubscriptionEntitled("past_due"), true)
    assert.equal(isSubscriptionInGrace("past_due"), true)
  })

  it("cuts off clinics Stripe has given up on", () => {
    assert.equal(isSubscriptionEntitled("unpaid"), false)
    assert.equal(isSubscriptionEntitled("canceled"), false)
    assert.equal(isSubscriptionEntitled("incomplete"), false)
    assert.equal(isSubscriptionEntitled("none"), false)
  })

  // A status Stripe introduces later must not accidentally grant access.
  it("does not entitle an unrecognized status", () => {
    assert.equal(isSubscriptionEntitled("some_future_status"), false)
  })
})

describe("resolveClinicAccess", () => {
  it("serves an active, subscribed clinic", () => {
    assert.deepEqual(
      resolveClinicAccess({ status: "active", subscriptionStatus: "active" }),
      { ok: true, grace: false },
    )
  })

  it("flags grace for a past_due clinic that is still served", () => {
    assert.deepEqual(
      resolveClinicAccess({ status: "active", subscriptionStatus: "past_due" }),
      { ok: true, grace: true },
    )
  })

  // Suspension is an explicit admin decision and must outrank billing state,
  // so a suspended clinic can never be re-opened by a Stripe webhook.
  it("lets suspension win over a healthy subscription", () => {
    assert.deepEqual(
      resolveClinicAccess({ status: "suspended", subscriptionStatus: "active" }),
      { ok: false, reason: "suspended" },
    )
  })

  it("blocks an unsubscribed clinic", () => {
    assert.deepEqual(
      resolveClinicAccess({ status: "active", subscriptionStatus: "none" }),
      { ok: false, reason: "subscription" },
    )
  })
})

describe("resolveScanQuota", () => {
  it("reports remaining scans against the plan quota", () => {
    assert.deepEqual(
      resolveScanQuota({ periodScanCount: 20, plan: { monthlyScanQuota: 100 } }),
      { used: 20, limit: 100, remaining: 80, exhausted: false },
    )
  })

  it("marks an exactly-consumed quota as exhausted", () => {
    const quota = resolveScanQuota({
      periodScanCount: 100,
      plan: { monthlyScanQuota: 100 },
    })
    assert.equal(quota.remaining, 0)
    assert.equal(quota.exhausted, true)
  })

  it("never reports negative remaining when usage overshoots", () => {
    const quota = resolveScanQuota({
      periodScanCount: 130,
      plan: { monthlyScanQuota: 100 },
    })
    assert.equal(quota.remaining, 0)
    assert.equal(quota.exhausted, true)
  })

  it("treats a negative quota as unlimited", () => {
    assert.deepEqual(
      resolveScanQuota({ periodScanCount: 5000, plan: { monthlyScanQuota: -1 } }),
      { used: 5000, limit: null, remaining: null, exhausted: false },
    )
  })

  // An unset plan is a provisioning gap, not a licence to run unmetered.
  it("gives a clinic with no plan no allowance", () => {
    assert.deepEqual(resolveScanQuota({ periodScanCount: 0, plan: null }), {
      used: 0,
      limit: 0,
      remaining: 0,
      exhausted: true,
    })
  })
})
