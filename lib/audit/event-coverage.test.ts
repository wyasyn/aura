import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

/**
 * The five events that closed the audit backlog.
 *
 * Each sits on a path that already existed and recorded nothing. What matters
 * about them is not that a call is present — the coverage assertion in
 * tenant-operations.test.ts already enforces that — but *where* it sits: after
 * the compare-and-set rather than beside it, excluded from states that are not
 * outcomes, and carrying no card data.
 */

const billing = readFileSync("lib/billing/actions.ts", "utf8")
const booking = readFileSync("lib/experts/booking-actions.ts", "utf8")
const collect = readFileSync("lib/training/collect.ts", "utf8")
const reportRoute = readFileSync("app/api/reports/[scanId]/pdf/route.ts", "utf8")
const pdf = readFileSync("lib/pdf/generate-skin-report.tsx", "utf8")

/** The metadata object literals in a file, which is where secrets would hide. */
function metadataLiterals(src: string): string[] {
  return [...src.matchAll(/metadata: \{[^{}]*\}/g)].map((m) => m[0])
}

describe("report.viewed", () => {
  it("records the download rather than the report", () => {
    assert.match(reportRoute, /action: "report\.viewed"/)
    assert.match(reportRoute, /metadata: \{ format: "pdf" \}/)
  })

  // The scan is already scoped to session.user.id inside the generator, so the
  // tenant is for attribution, not authorization.
  it("attributes the tenant when the scan came through a clinic", () => {
    assert.match(pdf, /return \{ buffer, organizationId: scan\.organizationId \}/)
    assert.match(reportRoute, /organizationId: report\.organizationId/)
  })

  it("still scopes the scan to the signed-in user", () => {
    assert.match(pdf, /where: \{ id: scanId, userId \}/)
  })

  // A log failure must not stand between someone and their own results.
  it("is best-effort, not transactional", () => {
    assert.match(reportRoute, /await recordAudit\(/)
    assert.doesNotMatch(reportRoute, /recordAuditIn/)
  })
})

describe("appointment.cancelled", () => {
  it("fires only on the attempt that actually flipped the row", () => {
    const fn = booking.match(/export async function finalizeBookingIntent[\s\S]*?\n\}/)
    assert.ok(fn)
    assert.match(fn[0], /const cancelled = await prisma\.booking\.updateMany/)
    assert.ok(
      fn[0].indexOf("cancelled.count > 0") < fn[0].indexOf('action: "appointment.cancelled"'),
      "the audit must sit behind the compare-and-set guard",
    )
  })

  // requires_action leaves the booking pending_payment; it is a step, not a
  // cancellation, and the guard that skips it is the same one that skips
  // releasing the slot.
  it("is not recorded when the payment merely requires action", () => {
    const fn = booking.match(/export async function finalizeBookingIntent[\s\S]*?\n\}/)
    assert.ok(fn)
    assert.ok(
      fn[0].indexOf("if (!isRequiresAction)") < fn[0].indexOf('action: "appointment.cancelled"'),
    )
  })
})

describe("payment.completed and payment.failed", () => {
  it("completion fires only on the claim that flipped the row", () => {
    assert.ok(
      billing.indexOf("if (claimed.count === 0)") <
        billing.indexOf('action: "payment.completed"'),
      "the audit must sit after the compare-and-set short-circuit",
    )
  })

  // A payment that needs 3-D Secure is not a failed payment. Recording it as
  // one would fill the trail with payments that went on to succeed.
  it("failure excludes requires_action", () => {
    assert.match(billing, /if \(intent\.status !== "requires_action"\) \{/)
    assert.ok(
      billing.indexOf('intent.status !== "requires_action"') <
        billing.indexOf('action: "payment.failed"'),
    )
  })

  it("records the money, not the instrument", () => {
    for (const block of metadataLiterals(billing)) {
      assert.doesNotMatch(block, /cardBrand|cardLast4|card\b/i, `card data in: ${block}`)
    }
    assert.match(billing, /amountCents: payment\.amountCents/)
  })
})

describe("training.record.withdrawn", () => {
  // Inside the withdrawal functions rather than at their call sites, so a
  // future caller cannot withdraw records without leaving the trail.
  it("is recorded by the withdrawal itself", () => {
    for (const fn of [
      "withdrawTrainingRecordsForUser",
      "withdrawTrainingRecordsForClinic",
    ]) {
      const body = collect.match(new RegExp(`export async function ${fn}[\\s\\S]*?\\n\\}`))
      assert.ok(body, `expected ${fn}`)
      assert.match(body[0], /recordWithdrawal\(/)
      assert.match(body[0], /actor: TrainingActor/)
    }
  })

  it("writes one entry per withdrawal, carrying the count", () => {
    assert.match(collect, /action: "training\.record\.withdrawn"/)
    assert.match(collect, /metadata: \{ reason, records: count \}/)
  })

  // Withdrawing nothing is not an event, and a consent toggle that changed no
  // records should not look like one that did.
  it("stays silent when nothing changed", () => {
    const fn = collect.match(/async function recordWithdrawal[\s\S]*?\n\}/)
    assert.ok(fn)
    assert.match(fn[0], /if \(count === 0\) return/)
  })

  it("carries the tenant for a clinic-wide withdrawal", () => {
    const body = collect.match(
      /export async function withdrawTrainingRecordsForClinic[\s\S]*?\n\}/,
    )
    assert.ok(body)
    assert.match(body[0], /organizationId,/)
  })
})

describe("none of the new entries carry clinical or card data", () => {
  const FORBIDDEN: [string, RegExp][] = [
    ["card data", /cardbrand|cardlast4|\bpan\b|cvv/i],
    ["an assessment", /assessment|dimensions|doshaTyping|overallBand|payload/i],
    ["a secret", /token|secret|password|signature|plaintext/i],
  ]

  for (const [label, src] of [
    ["billing", billing],
    ["booking", booking],
    ["training collect", collect],
    ["report route", reportRoute],
  ] as const) {
    for (const [what, pattern] of FORBIDDEN) {
      it(`${label} carries no ${what}`, () => {
        for (const block of metadataLiterals(src)) {
          assert.doesNotMatch(block, pattern, `in ${label}: ${block}`)
        }
      })
    }
  }
})
