import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { getNavSections, type AppRole } from "@/lib/dashboard/nav"
import {
  MembershipRuleError,
  SEAT_CONSUMING_STATUSES,
  assertCanChangeRole,
  assertCanRevoke,
  assertCanSetStatus,
  statusAuditAction,
} from "@/lib/clinics/membership-rules"

/**
 * Admin control plane guarantees.
 *
 * The lifecycle rules are exercised directly, now that they live in a module
 * with no database import. The rest is asserted against source, because those
 * guarantees are properties of the *shape* of the code — that a mutation writes
 * a status rather than deleting a row, that a loader authorizes itself, that a
 * lookup carries its tenant inside the where clause. None can be demonstrated
 * by calling a function with test data.
 */

const memberActions = readFileSync("lib/clinics/member-actions.ts", "utf8")
const queries = readFileSync("lib/clinics/queries.ts", "utf8")
const auditQueries = readFileSync("lib/admin/audit-queries.ts", "utf8")
const auditLoader = readFileSync("components/admin/audit-log-loader.tsx", "utf8")
const adminActions = readFileSync("lib/admin/membership-actions.ts", "utf8")
const adminQueries = readFileSync("lib/admin/clinic-queries.ts", "utf8")

const member = (over: Partial<{ role: string; status: string }> = {}) =>
  ({ role: "member", status: "active", ...over }) as Parameters<typeof assertCanRevoke>[0]

describe("membership lifecycle rules", () => {
  it("an ordinary member can be demoted, suspended and revoked", () => {
    assert.doesNotThrow(() => assertCanChangeRole(member()))
    assert.doesNotThrow(() => assertCanSetStatus(member(), "suspended"))
    assert.doesNotThrow(() => assertCanRevoke(member()))
  })

  // The owner is the billing contact and the last guaranteed route to control.
  it("the owner is protected from every one of them", () => {
    for (const fn of [
      () => assertCanChangeRole(member({ role: "owner" })),
      () => assertCanRevoke(member({ role: "owner" })),
      () => assertCanSetStatus(member({ role: "owner" }), "suspended"),
    ]) {
      assert.throws(fn, MembershipRuleError)
    }
  })

  // Suspension is reversible; revocation ends the relationship. Coming back
  // goes through a fresh invitation, so the return is itself a recorded act.
  it("a suspended membership can be reinstated", () => {
    assert.doesNotThrow(() => assertCanSetStatus(member({ status: "suspended" }), "active"))
  })

  it("a revoked membership cannot be reinstated by flipping the status", () => {
    assert.throws(
      () => assertCanSetStatus(member({ status: "revoked" }), "active"),
      /cannot be reinstated/,
    )
  })

  it("only active and invited memberships consume a seat", () => {
    assert.deepEqual([...SEAT_CONSUMING_STATUSES].sort(), ["active", "invited"])
  })

  it("the status transition names its own audit action", () => {
    assert.equal(statusAuditAction("suspended"), "membership.suspended")
    assert.equal(statusAuditAction("active"), "membership.reactivated")
  })
})

describe("membership is a lifecycle, not a row that disappears", () => {
  it("no membership mutation deletes a row, on either path", () => {
    for (const src of [memberActions, adminActions]) {
      assert.doesNotMatch(src, /member\.delete\(/)
    }
  })

  it("revoking sets the status instead", () => {
    for (const src of [memberActions, adminActions]) {
      assert.match(src, /data: \{ status: "revoked" \}/)
      assert.match(src, /membership\.revoked/)
    }
  })

  // Private copies would drift, and owner protection would be first to go.
  it("both paths share one set of rules", () => {
    for (const src of [memberActions, adminActions]) {
      assert.match(src, /membership-rules/)
      assert.match(src, /assertCanRevoke/)
    }
  })

  it("every membership mutation is audited on both paths", () => {
    for (const src of [memberActions, adminActions]) {
      assert.match(src, /membership\.role_changed/)
      assert.match(src, /statusAuditAction/)
    }
  })

  // A revoked member is not staff. Leaving them listed would show them as
  // colleagues and, worse, hold a seat against the plan.
  it("revoked members leave the team list and free their seat", () => {
    assert.match(queries, /status: \{ not: "revoked" \}/)
    assert.match(memberActions, /status: \{ in: \["active", "invited"\] \}/)
  })
})

describe("membership mutations stay inside one tenant", () => {
  it("the clinic path scopes every lookup to the caller's own tenant", () => {
    const lookups = [...memberActions.matchAll(/member\.findFirst\(\{[\s\S]*?\}\)/g)]
    assert.ok(lookups.length >= 3, "expected the membership lookups")
    for (const l of lookups) {
      assert.match(l[0], /organizationId: session\.scope/)
    }
  })

  it("the clinic path accepts no organizationId at all", () => {
    for (const m of memberActions.matchAll(/z\.object\(\{[\s\S]*?\}\)/g)) {
      assert.doesNotMatch(m[0], /organizationId/)
    }
  })
})

describe("platform administration is a separate flow, not a borrowed scope", () => {
  // A TenantScope can only be minted by resolving a membership, and an admin is
  // not a member. Minting one for them would erase the distinction between
  // operating the platform and belonging to a tenant.
  it("admin queries never mint or take a TenantScope", () => {
    assert.doesNotMatch(adminQueries, /asTenantScope/)
    assert.doesNotMatch(adminQueries, /organizationId: TenantScope/)
  })

  it("every admin membership mutation authorizes as an administrator", () => {
    const fns = [...adminActions.matchAll(/export async function (\w+)/g)].map((m) => m[1])
    assert.ok(fns.length >= 3, "expected the admin membership actions")
    for (const fn of fns) {
      const body = adminActions.match(
        new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`),
      )
      assert.ok(body, `expected the body of ${fn}`)
      assert.match(body[0], /requireAdmin\(\)/)
    }
  })

  // organizationId names which membership to act on. It never grants the right
  // to act: requireAdmin has already run before it is read.
  it("the membership is matched on the tenant pair, never by id alone", () => {
    assert.match(adminActions, /where: \{ id: memberId, organizationId \}/)
    assert.doesNotMatch(adminActions, /member\.findUnique/)
  })

  it("a membership outside the named tenant is refused and recorded", () => {
    assert.match(adminActions, /recordDenied/)
    assert.match(adminActions, /not_in_tenant/)
  })

  it("a refused rule is recorded as denied rather than thrown away", () => {
    assert.match(adminActions, /MembershipRuleError/)
    assert.match(adminActions, /reason: "rule"/)
  })
})

describe("control plane reads avoid N+1", () => {
  it("membership counts come from one grouped query", () => {
    const fn = adminQueries.match(
      /export async function getClinicMembershipCounts[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.match(fn[0], /groupBy/)
  })

  // An administrator needs to know a clinic has 400 patients, not who they are.
  it("clinic detail counts come from relation aggregates, not loaded rows", () => {
    const fn = adminQueries.match(/export async function getClinicDetail[\s\S]*?\n\}/)
    assert.ok(fn)
    assert.match(fn[0], /_count: \{ select: \{[^}]*patients[^}]*\} \}/)
  })

  it("the dashboard summary groups rather than iterating clinics", () => {
    const fn = adminQueries.match(/export async function getClinicSummary[\s\S]*?\n\}/)
    assert.ok(fn)
    assert.match(fn[0], /groupBy/)
  })
})

describe("audit viewer", () => {
  it("authorizes itself rather than trusting the layout", () => {
    assert.match(auditLoader, /await requireAdmin\(\)/)
  })

  it("is cursor paginated rather than loading the whole table", () => {
    assert.match(auditQueries, /AUDIT_PAGE_SIZE/)
    assert.match(auditQueries, /cursor: \{ id: filter\.cursor \}/)
  })

  it("resolves actors and tenants without N+1", () => {
    assert.match(auditQueries, /id: \{ in: actorIds \}/)
    assert.match(auditQueries, /organizationId: \{ in: orgIds \}/)
  })

  // The entry must outlive the tenant, or deleting a clinic erases the record
  // of it having been deleted.
  it("survives the deletion of its tenant", () => {
    assert.match(auditQueries, /deleted: !org/)
    assert.match(auditQueries, /meta\.subdomain/)
  })
})

describe("admin navigation", () => {
  it("offers Clinics and the audit log to administrators", () => {
    const hrefs = getNavSections("admin" as AppRole)
      .flatMap((s) => s.items)
      .map((i) => i.href)
    assert.ok(hrefs.includes("/admin/clinics"), "Clinics must stay in the admin sidebar")
    assert.ok(hrefs.includes("/admin/audit"))
  })

  for (const role of ["user", "expert", "affiliate"] as AppRole[]) {
    it(`does not offer them to a ${role}`, () => {
      const hrefs = getNavSections(role)
        .flatMap((s) => s.items)
        .map((i) => i.href)
      assert.ok(!hrefs.some((h) => h.startsWith("/admin")))
    })
  }
})

describe("tenant deletion stays accountable", () => {
  const offboard = readFileSync("lib/admin/clinic-offboard-actions.ts", "utf8")

  it("records enough to identify the tenant after its rows are gone", () => {
    const entry = offboard.match(/action: "tenant\.deleted"[\s\S]*?\n  \}\)/)
    assert.ok(entry, "expected the deletion audit entry")
    for (const field of ["subdomain", "displayName", "detachedScans"]) {
      assert.match(entry[0], new RegExp(field))
    }
  })

  it("writes the entry before the delete", () => {
    assert.ok(
      offboard.indexOf('action: "tenant.deleted"') < offboard.indexOf("organization.delete"),
    )
  })
})
