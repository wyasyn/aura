import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

/**
 * Tenant lifecycle operations.
 *
 * Phase 7 proved that a tenant is selected by exactly one authority. These
 * assert the other half: that every operation which grants, moves or removes
 * access to a tenant leaves a durable record, and that the record carries no
 * secret.
 *
 * Asserted against source because an audit call is a property of the shape of
 * the code. Whether it fires is exercised live, not here.
 */

const clinicActions = readFileSync("lib/admin/clinic-actions.ts", "utf8")
const memberActions = readFileSync("lib/clinics/member-actions.ts", "utf8")
const adminMembership = readFileSync("lib/admin/membership-actions.ts", "utf8")
const domainActions = readFileSync("lib/clinics/domain-actions.ts", "utf8")
const apiKeyActions = readFileSync("lib/clinics/api-key-actions.ts", "utf8")
const offboard = readFileSync("lib/admin/clinic-offboard-actions.ts", "utf8")
const auditLog = readFileSync("lib/audit/log.ts", "utf8")
const exportRoute = readFileSync(
  "app/api/admin/clinics/[clinicId]/export/route.ts",
  "utf8",
)

const LIFECYCLE = [clinicActions, memberActions, adminMembership, domainActions, apiKeyActions, offboard, exportRoute].join("\n")

/**
 * Every source file that could hold an audit writer.
 *
 * Walked rather than listed: a hand-maintained list would quietly stop
 * covering a file the day someone moves a writer, and the assertion that the
 * backlog is exact depends on this being complete.
 */
const SOURCES: string[] = (function collect(dirs: string[]): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
        if (full.replace(/\\/g, "/").endsWith("lib/audit/log.ts")) continue
        out.push(readFileSync(full, "utf8"))
      }
    }
  }
  for (const dir of dirs) walk(dir)
  return out
})(["lib", "app"])

describe("every tenant lifecycle transition is auditable", () => {
  // A tenant's existence needs a recorded beginning as well as a recorded end.
  // Deletion was audited first, which left a log where clinics only ever
  // vanished.
  const transitions = [
    "tenant.created",
    "tenant.suspended",
    "tenant.plan_changed",
    "tenant.comp_access_changed",
    "tenant.deleted",
    "tenant.domain_claimed",
    "tenant.domain_verified",
    "tenant.domain_removed",
    "membership.invited",
    "membership.invitation_cancelled",
    "membership.created",
    "membership.role_changed",
    "membership.revoked",
    "apikey.created",
    "apikey.revoked",
    "admin.data_exported",
  ]

  for (const action of transitions) {
    it(`records ${action}`, () => {
      assert.match(LIFECYCLE, new RegExp(`"${action.replace(/\./g, "\\.")}"`))
    })
  }

  // membership.suspended and .reactivated come from statusAuditAction rather
  // than a literal, so they are checked where that mapping lives.
  it("records the status transitions through the shared mapping", () => {
    const rules = readFileSync("lib/clinics/membership-rules.ts", "utf8")
    assert.match(rules, /"membership\.suspended"/)
    assert.match(rules, /"membership\.reactivated"/)
    for (const src of [memberActions, adminMembership]) {
      assert.match(src, /statusAuditAction/)
    }
  })
})

describe("no declared audit action is dead", () => {
  /**
   * A closed union is only useful while every member of it is reachable. An
   * action nobody writes reads, in the viewer, as an event that never happens —
   * indistinguishable from one that happens and is not recorded.
   *
   * The backlog is empty: every declared action now has a writer.
   *
   * Kept as an explicit set rather than deleted, because the assertion below
   * checks it is *exactly* the unwritten set. Emptiness is therefore enforced
   * in both directions — declaring an action without a writer fails, and so
   * does exempting one here that is in fact written.
   */
  const KNOWN_UNWRITTEN = new Set<string>([])

  const declared = [...auditLog.matchAll(/^\s+\| "([a-z_]+\.[a-z_.]+)"/gm)].map((m) => m[1])

  it("the union is non-trivial", () => {
    assert.ok(declared.length >= 40, `expected the full union, saw ${declared.length}`)
  })

  /** Every source file that could contain a writer, searched for the literal. */
  function hasWriter(action: string): boolean {
    const literal = new RegExp(`"${action.replace(/\./g, "\\.")}"`)
    return SOURCES.some((src) => literal.test(src))
  }

  it("every tenancy-surface action has a writer", () => {
    const unwritten = declared.filter(
      (a) => !KNOWN_UNWRITTEN.has(a) && !hasWriter(a),
    )
    const tenancy = unwritten.filter(
      (a) => /^(tenant|membership|apikey)\./.test(a) || a.startsWith("admin."),
    )
    assert.deepEqual(tenancy, [], `unwritten tenancy actions: ${tenancy.join(", ")}`)
  })

  // Both directions. A backlog entry that has since been implemented must be
  // removed from the list, or it silently exempts a real regression later.
  it("the backlog is exactly the unwritten set, no more and no less", () => {
    const actuallyUnwritten = declared.filter((a) => !hasWriter(a)).sort()
    assert.deepEqual([...KNOWN_UNWRITTEN].sort(), actuallyUnwritten)
  })
})

describe("audit metadata carries no secret", () => {
  /**
   * The metadata object literals only — matching a whole function would flag
   * the plaintext key on its way out of createClinicApiKeyAction, which is the
   * one place it is legitimately handled.
   */
  function metadataLiterals(src: string): string[] {
    return [...src.matchAll(/metadata: \{[^{}]*\}/g)].map((m) => m[0])
  }

  const FORBIDDEN: [string, RegExp][] = [
    ["a password", /password/i],
    ["a session token or cookie", /session_token|sessiontoken|cookie|authorization/i],
    ["an api key plaintext or hash", /plaintext|hashedkey/i],
    ["a domain verification token", /\btoken\b/i],
    ["a stripe secret", /sk_live|sk_test|stripesecret|webhook_secret|webhooksecret/i],
    ["a signature", /signature/i],
  ]

  for (const [label, src] of [
    ["clinic-actions", clinicActions],
    ["member-actions", memberActions],
    ["admin membership-actions", adminMembership],
    ["domain-actions", domainActions],
    ["api-key-actions", apiKeyActions],
    ["offboard-actions", offboard],
    ["admin export route", exportRoute],
  ] as const) {
    const blocks = metadataLiterals(src)
    for (const [what, pattern] of FORBIDDEN) {
      it(`${label} carries no ${what}`, () => {
        for (const block of blocks) {
          assert.doesNotMatch(block, pattern, `in ${label}: ${block}`)
        }
      })
    }
  }

  // The export names how much left and whose it was, never any of the content.
  it("the data export records counts, not records", () => {
    const meta = metadataLiterals(exportRoute)
    assert.equal(meta.length >= 1, true)
    const joined = meta.join("\n")
    assert.match(joined, /members: data\.members\.length/)
    assert.match(joined, /scans: data\.scans\.length/)
    assert.doesNotMatch(joined, /email|name:|result|assessment/i)
  })
})

describe("the invitation is a single-use grant scoped to one tenant", () => {
  // Three properties, all expressed in one where clause: the invitation must
  // belong to this tenant, must still be pending, and is flipped in the same
  // transaction that creates the membership.
  it("acceptance is scoped to the resolved tenant and to pending", () => {
    const fn = memberActions.match(
      /export async function acceptClinicInvitationAction[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.match(fn[0], /where: \{ id: invitationId, organizationId, status: "pending" \}/)
    assert.match(fn[0], /expiresAt < new Date\(\)/)
    assert.match(fn[0], /invitation\.email\.toLowerCase\(\) !== user\.email\.toLowerCase\(\)/)
  })

  it("membership creation and invitation consumption are one transaction", () => {
    const fn = memberActions.match(
      /export async function acceptClinicInvitationAction[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.match(fn[0], /\$transaction/)
    assert.match(fn[0], /status: "accepted"/)
  })

  it("cancelling is scoped to the caller's own tenant", () => {
    const fn = memberActions.match(
      /export async function cancelClinicInvitationAction[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.match(fn[0], /organizationId: session\.scope/)
    assert.match(fn[0], /recordDenied/)
  })
})

describe("deletion stays accountable and cannot reach another tenant", () => {
  it("is confirmed by typing the subdomain", () => {
    assert.match(offboard, /confirmSubdomain !== clinic\.subdomain/)
  })

  it("writes the record before the rows go", () => {
    assert.ok(
      offboard.indexOf('action: "tenant.deleted"') < offboard.indexOf("organization.delete"),
    )
  })

  it("deletes exactly one organization, named by its own id", () => {
    assert.match(offboard, /organization\.delete\(\{ where: \{ id: clinic\.organizationId \} \}\)/)
    assert.doesNotMatch(offboard, /organization\.deleteMany/)
  })

  // The entry must outlive the tenant it describes, or deleting a clinic
  // erases the evidence of the deletion.
  it("the audit table has no foreign key to the tenant", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8")
    const model = schema.match(/model AuditLog \{[\s\S]*?\n\}/)
    assert.ok(model)
    assert.match(model[0], /organizationId String\?/)
    assert.doesNotMatch(model[0], /@relation/)
  })
})

describe("partner API keys are tenant credentials", () => {
  const authenticate = readFileSync("lib/api-keys/authenticate.ts", "utf8")
  const handler = readFileSync("lib/api-keys/handler.ts", "utf8")
  const scanRoute = readFileSync("app/api/v1/scans/[scanId]/route.ts", "utf8")

  it("a revoked key is refused", () => {
    assert.match(authenticate, /!record \|\| record\.revokedAt/)
  })

  // Telling an unknown key from a revoked one tells an attacker which guesses
  // were real keys.
  it("unknown and revoked keys are refused identically", () => {
    const messages = [...authenticate.matchAll(/unauthorized\("([^"]+)"\)/g)].map((m) => m[1])
    const invalid = messages.filter((m) => m === "Invalid API key.")
    assert.ok(invalid.length >= 3, `expected one shared message, saw ${messages.join(" | ")}`)
  })

  it("the tenant comes from the credential, never from the request", () => {
    assert.match(scanRoute, /organizationId: caller\.organizationId/)
    assert.doesNotMatch(scanRoute, /searchParams\.get\("organizationId"\)/)
  })

  // Scoping in the where clause rather than checking after the read: a lookup
  // by id alone would load another tenant's row before deciding.
  it("a resource id is scoped in the lookup itself", () => {
    assert.match(scanRoute, /where: \{ id: scanId, organizationId: caller\.organizationId \}/)
  })

  it("an internal failure never reaches the partner", () => {
    assert.match(handler, /error: "internal_error"/)
    assert.doesNotMatch(handler, /message: (error|String\(error\))/)
  })
})
