import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { buildShareLink, monthlyEarnings } from "@/lib/affiliates/share-link"

describe("buildShareLink", () => {
  it("attaches the coupon code", () => {
    const link = buildShareLink("https://shop.example/product/serum", "AURORA-X-1")
    assert.equal(link, "https://shop.example/product/serum?coupon_code=AURORA-X-1")
  })

  it("keeps existing query parameters", () => {
    const link = buildShareLink("https://shop.example/p?variant=50ml", "CODE")
    assert.ok(link?.includes("variant=50ml"))
    assert.ok(link?.includes("coupon_code=CODE"))
  })

  it("replaces a stale coupon rather than appending a second one", () => {
    const link = buildShareLink(
      "https://shop.example/p?coupon_code=OLD",
      "NEW",
    )
    assert.ok(link?.includes("coupon_code=NEW"))
    assert.ok(!link?.includes("OLD"))
  })

  it("still returns a usable link when there is no code yet", () => {
    assert.equal(
      buildShareLink("https://shop.example/p", null),
      "https://shop.example/p",
    )
  })

  it("returns null when a product has no store link", () => {
    assert.equal(buildShareLink(null, "CODE"), null)
    assert.equal(buildShareLink("", "CODE"), null)
  })

  // A product row could hold anything; handing a customer a javascript: URL
  // would be worse than showing nothing.
  it("refuses anything that is not http or https", () => {
    assert.equal(buildShareLink("javascript:alert(1)", "CODE"), null)
    assert.equal(buildShareLink("not a url", "CODE"), null)
  })
})

describe("monthlyEarnings", () => {
  const order = (date: string, cents: number, status: string) => ({
    placedAt: new Date(date),
    commissionAmountCents: cents,
    status,
  })

  it("groups confirmed orders by month, newest first", () => {
    const result = monthlyEarnings([
      order("2026-07-05T10:00:00Z", 500, "confirmed"),
      order("2026-08-02T10:00:00Z", 300, "confirmed"),
      order("2026-08-20T10:00:00Z", 200, "confirmed"),
    ])

    assert.deepEqual(result, [
      { month: "2026-08", orders: 2, commissionCents: 500 },
      { month: "2026-07", orders: 1, commissionCents: 500 },
    ])
  })

  // Counting these as earnings would overstate what the affiliate is owed.
  it("excludes pending and cancelled orders", () => {
    const result = monthlyEarnings([
      order("2026-08-02T10:00:00Z", 300, "confirmed"),
      order("2026-08-03T10:00:00Z", 999, "pending"),
      order("2026-08-04T10:00:00Z", 999, "cancelled"),
    ])

    assert.deepEqual(result, [{ month: "2026-08", orders: 1, commissionCents: 300 }])
  })

  it("returns nothing when there are no confirmed orders", () => {
    assert.deepEqual(monthlyEarnings([]), [])
    assert.deepEqual(
      monthlyEarnings([order("2026-08-02T10:00:00Z", 300, "pending")]),
      [],
    )
  })
})
