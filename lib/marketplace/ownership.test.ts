import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

/**
 * Marketplace and payment ownership boundaries.
 *
 * These assert the *shape* of the schema and the webhook paths, because that is
 * where the guarantees live. "Experts are global" is a statement about a column
 * that must not exist; "a replayed order does not pay twice" is a statement
 * about a unique constraint and a branch. Neither can be proven by calling a
 * function with test data.
 *
 * Live external verification against Stripe and WooCommerce is a separate
 * matter and is not claimed here.
 */

const schema = readFileSync("prisma/schema.prisma", "utf8")

function model(name: string): string {
  const m = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))
  assert.ok(m, `expected model ${name} in the schema`)
  return m[0]
}

describe("global resources carry no tenant", () => {
  // An expert serves many clinics. Putting a tenant on the expert would force
  // one row per clinic and make the marketplace a per-tenant directory.
  for (const name of [
    "ExpertProfile",
    "ExpertAvailabilitySlot",
    "ExpertReview",
    "AffiliateProfile",
    "AffiliateOrder",
    "AffiliatePayout",
    "ClinicPlan",
    "ScanPack",
    "AiModelRate",
    "User",
  ]) {
    it(`${name} has no organizationId`, () => {
      assert.doesNotMatch(model(name), /\borganizationId\b/)
    })
  }
})

describe("user-owned resources are keyed by the person", () => {
  for (const name of ["Payment", "ScanBalance", "ScanLedger"]) {
    it(`${name} is keyed by userId and carries no tenant`, () => {
      const m = model(name)
      assert.match(m, /\buserId\b/)
      assert.doesNotMatch(m, /\borganizationId\b/)
    })
  }

  // Payment is not a general payments table: packId, tier and scanCount mean
  // every row is a scan-pack purchase. Consultation money lives on Booking.
  it("Payment models scan packs specifically", () => {
    const m = model("Payment")
    assert.match(m, /packId/)
    assert.match(m, /tier\s+ScanTier/)
    assert.match(m, /scanCount/)
  })
})

describe("tenant-owned resources carry the tenant", () => {
  for (const name of ["Booking", "Scan", "ClinicSettings", "ClinicPatient", "ApiKey"]) {
    it(`${name} carries organizationId`, () => {
      assert.match(model(name), /\borganizationId\b/)
    })
  }

  // The clinic's subscription is columns on ClinicSettings, not a separate
  // model, so it is tenant-owned by construction.
  it("the clinic subscription lives on ClinicSettings", () => {
    const m = model("ClinicSettings")
    assert.match(m, /stripeCustomerId\s+String\?\s+@unique/)
    assert.match(m, /stripeSubscriptionId\s+String\?\s+@unique/)
  })
})

describe("webhook lookups cannot be redirected", () => {
  // Every external reference a webhook resolves by is unique, so a verified
  // event matches at most one row and cannot be pointed at another tenant.
  it("every external payment reference is unique", () => {
    assert.match(model("Payment"), /providerRef\s+String\s+@unique/)
    assert.match(model("Booking"), /paymentRef\s+String\?\s+@unique/)
    assert.match(model("AffiliateOrder"), /wooCommerceOrderId\s+Int\s+@unique/)
  })

  it("Stripe events are signature-verified before anything is read", () => {
    const route = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")
    const verifyAt = route.indexOf("constructEvent")
    const firstQueryAt = route.indexOf("prisma.")
    assert.ok(verifyAt > -1, "expected signature construction")
    assert.ok(firstQueryAt > verifyAt, "no database read may precede verification")
    assert.match(route, /Invalid signature[\s\S]*?status: 400/)
  })

  it("a missing Stripe secret fails closed", () => {
    const route = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")
    assert.match(route, /STRIPE_WEBHOOK_SECRET[\s\S]*?status: 500/)
  })

  it("WooCommerce signatures are compared in constant time", () => {
    const hook = readFileSync("lib/affiliates/webhook.ts", "utf8")
    assert.match(hook, /createHmac\("sha256"/)
    assert.match(hook, /timingSafeEqual/)
    // Length is checked first: timingSafeEqual throws on a length mismatch.
    assert.match(hook, /length !== [\s\S]{0,40}length\) return false/)
  })

  it("a WooCommerce order is attributed once and never re-attributed", () => {
    const hook = readFileSync("lib/affiliates/webhook.ts", "utf8")
    const replay = hook.match(/if \(existing\) \{[\s\S]*?\n  \}/)
    assert.ok(replay, "expected the replay branch")

    // Status and totals may move; the affiliate may not. A second webhook
    // carrying another coupon must not hand the commission to someone else,
    // so affiliateId is absent from what the update writes.
    const written = replay[0].match(/data: \{[^}]*\}/)
    assert.ok(written, "expected the update payload")
    assert.doesNotMatch(written[0], /affiliateId/)

    // And the result reports the affiliate actually credited, not the coupon
    // on this delivery — they differ exactly in the re-attribution case.
    assert.match(replay[0], /affiliateId: existing\.affiliateId/)
  })

  it("commission is snapshotted, so a later rate change cannot rewrite history", () => {
    assert.match(model("AffiliateOrder"), /commissionRateBpsSnapshot/)
  })
})

describe("system actions are not attributed to a person", () => {
  const log = readFileSync("lib/audit/log.ts", "utf8")

  it("SYSTEM_ACTOR is a null actor, not an invented user", () => {
    const decl = log.match(/export const SYSTEM_ACTOR = \{[^}]*\}/)
    assert.ok(decl)
    assert.match(decl[0], /actorId: null/)
    assert.match(decl[0], /actorRole: "system"/)
  })

  for (const [file, label] of [
    ["lib/clinics/subscription-sync.ts", "subscription sync"],
    ["lib/affiliates/webhook.ts", "affiliate attribution"],
  ] as const) {
    it(`${label} records as a system action`, () => {
      assert.match(readFileSync(file, "utf8"), /\.\.\.SYSTEM_ACTOR/)
    })
  }
})

describe("tenant lifecycle is auditable", () => {
  const offboard = readFileSync("lib/admin/clinic-offboard-actions.ts", "utf8")
  const actions = readFileSync("lib/admin/clinic-actions.ts", "utf8")

  // The gap this phase closed. A whole tenant was deleted leaving nothing in
  // the audit table — only a console line, which is ephemeral and unqueryable.
  it("deleting a tenant is audited before the rows go", () => {
    const auditAt = offboard.indexOf('action: "tenant.deleted"')
    const deleteAt = offboard.indexOf("organization.delete")
    assert.ok(auditAt > -1, "expected a tenant.deleted entry")
    assert.ok(deleteAt > auditAt, "the audit must be written before the delete")
    assert.match(offboard, /actorId: session\.user\.id/)
  })

  it("status and plan changes are audited", () => {
    assert.match(actions, /action: "tenant\.plan_changed"/)
    assert.match(actions, /"tenant\.suspended"/)
  })

  it("no card, secret or signature reaches audit metadata", () => {
    for (const src of [offboard, actions, readFileSync("lib/affiliates/webhook.ts", "utf8")]) {
      for (const m of src.matchAll(/metadata: \{[\s\S]*?\}/g)) {
        assert.doesNotMatch(m[0], /cardLast4|cardBrand|secret|signature|clientSecret/i)
      }
    }
  })
})
