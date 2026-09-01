import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  UNLIMITED,
  formatLimit,
  formatScanQuota,
  formatSeats,
  isUnlimited,
  wouldExceedLimit,
} from "@/lib/clinics/plan-limits"

describe("wouldExceedLimit", () => {
  it("blocks at the limit, not one past it", () => {
    assert.equal(wouldExceedLimit(3, 2), false, "2 of 3 still has room")
    assert.equal(wouldExceedLimit(3, 3), true, "3 of 3 is full")
    assert.equal(wouldExceedLimit(3, 4), true)
  })

  // The whole point of the change: an unlimited plan must never block.
  it("never blocks on an unlimited plan", () => {
    assert.equal(wouldExceedLimit(UNLIMITED, 0), false)
    assert.equal(wouldExceedLimit(UNLIMITED, 10_000), false)
  })

  it("treats any negative value as unlimited", () => {
    assert.equal(wouldExceedLimit(-5, 999), false)
  })
})

describe("isUnlimited", () => {
  it("is true only for negatives", () => {
    assert.equal(isUnlimited(UNLIMITED), true)
    assert.equal(isUnlimited(0), false)
    assert.equal(isUnlimited(1), false)
  })
})

describe("formatting", () => {
  it("says Unlimited rather than -1", () => {
    assert.equal(formatLimit(UNLIMITED), "Unlimited")
    assert.equal(formatSeats(UNLIMITED), "Unlimited seats")
    assert.equal(formatScanQuota(UNLIMITED), "Unlimited scans")
  })

  it("pluralises seats correctly", () => {
    assert.equal(formatSeats(1), "1 seat")
    assert.equal(formatSeats(10), "10 seats")
  })

  it("renders finite quotas plainly", () => {
    assert.equal(formatLimit(500), "500")
    assert.equal(formatScanQuota(500), "500 scans / month")
  })
})
