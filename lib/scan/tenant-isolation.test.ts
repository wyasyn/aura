import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import {
  belongsToTenant,
  decideAccess,
  type ClinicAffiliation,
} from "@/lib/clinics/access-rules"
import { can, permissionsForTenantRole } from "@/lib/clinics/permissions"

/**
 * Scan tenant isolation.
 *
 * Two halves, because the guarantee has two halves. The decision half is
 * exercised directly. The structural half — that no tenant id can arrive from
 * the client — is asserted against the source, because the guarantee is the
 * *absence* of a parameter and there is nothing to call to prove an absence.
 *
 * Live cross-tenant behaviour is exercised against a real database in
 * lib/clinics/isolation.integration.test.ts.
 */

const A = "org_clinic_a"
const B = "org_clinic_b"

const affiliation = (over: Partial<ClinicAffiliation> = {}): ClinicAffiliation => ({
  userId: "usr_1",
  role: "user",
  memberships: [],
  patientOrganizationId: null,
  ...over,
})

const member = (organizationId: string, role = "member", status = "active") =>
  ({ organizationId, role, status }) as ClinicAffiliation["memberships"][number]

describe("scan access follows membership, not the requested tenant", () => {
  it("a member of Clinic A reaches Clinic A", () => {
    const a = affiliation({ memberships: [member(A)] })
    assert.equal(decideAccess(a, A).allowed, true)
    assert.equal(belongsToTenant(a, A), true)
  })

  it("a member of Clinic A is refused Clinic B", () => {
    const a = affiliation({ memberships: [member(A)] })
    assert.equal(decideAccess(a, B).allowed, false)
    assert.equal(belongsToTenant(a, B), false)
  })

  it("a member of both reaches both, and only those", () => {
    const a = affiliation({ memberships: [member(A), member(B)] })
    assert.equal(belongsToTenant(a, A), true)
    assert.equal(belongsToTenant(a, B), true)
    assert.equal(belongsToTenant(a, "org_clinic_c"), false)
  })

  for (const status of ["suspended", "revoked"] as const) {
    it(`a ${status} member of Clinic A cannot read its scans`, () => {
      const a = affiliation({ memberships: [member(A, "owner", status)] })
      assert.equal(belongsToTenant(a, A), false)
      assert.equal(decideAccess(a, A).allowed, false)
    })
  }

  it("a user with no membership reaches no tenant", () => {
    assert.equal(belongsToTenant(affiliation(), A), false)
    assert.equal(decideAccess(affiliation(), A).allowed, false)
  })
})

describe("SCAN_VIEW permission", () => {
  it("every tenant role that can be a member may view scans", () => {
    for (const role of ["owner", "admin", "member"]) {
      const ctx = { permissions: permissionsForTenantRole(role) }
      assert.equal(can(ctx, "SCAN_VIEW"), true, `${role} should hold SCAN_VIEW`)
    }
  })

  it("a context with no role holds nothing", () => {
    assert.equal(can({ permissions: permissionsForTenantRole(null) }, "SCAN_VIEW"), false)
  })

  // A platform admin reaching a clinic's site is not a member of it. Tenant
  // scan data stays behind a real membership; anything cross-tenant an
  // administrator needs belongs in the control plane behind requireAdmin.
  it("platform admin holds no tenant scan permission by role alone", () => {
    const admin = affiliation({ role: "admin" })
    assert.equal(belongsToTenant(admin, A), false)
  })
})

describe("no tenant id can arrive from the client", () => {
  const service = readFileSync("lib/scan/tenant-scans.ts", "utf8")

  // The reference read takes no organizationId. If one is ever added as a
  // parameter, a caller can pass a forged value and the branded TenantScope
  // stops being the only way in.
  it("the tenant read accepts no organizationId parameter", () => {
    const signature = service.match(
      /export async function listScansForCurrentTenant\([\s\S]*?\)/,
    )
    assert.ok(signature, "expected the reference read to inspect")
    assert.doesNotMatch(signature[0], /organizationId/)
    assert.doesNotMatch(signature[0], /tenantId/)
  })

  it("the tenant comes from the resolved session", () => {
    assert.match(service, /requireClinicMember\(\)/)
    assert.match(service, /session\.scope/)
  })

  it("the permission is asserted, not assumed", () => {
    assert.match(service, /requirePermission\(session, "SCAN_VIEW"\)/)
  })

  // The scoped queries take a branded TenantScope, so a string from a route
  // param or form field does not typecheck into them.
  it("clinic scan queries take a TenantScope, not a string", () => {
    const queries = readFileSync("lib/clinics/queries.ts", "utf8")
    assert.match(queries, /listClinicScans\(\s*organizationId: TenantScope/)
    assert.match(queries, /countClinicScans\(organizationId: TenantScope\)/)
  })
})

describe("scan audit carries actor and tenant", () => {
  const persist = readFileSync("lib/scan/persist-scan-result.ts", "utf8")
  const service = readFileSync("lib/scan/tenant-scans.ts", "utf8")

  it("scan.created records who and where", () => {
    const entry = persist.match(/action: "scan\.created"[\s\S]*?\}\)/)
    assert.ok(entry, "expected a scan.created audit entry")
    assert.match(entry[0], /actorId:/)
    assert.match(entry[0], /organizationId/)
  })

  it("scan.viewed records who and where", () => {
    const entry = service.match(/action: "scan\.viewed"[\s\S]*?\}\)/)
    assert.ok(entry, "expected a scan.viewed audit entry")
    assert.match(entry[0], /actorId: session\.userId/)
    assert.match(entry[0], /organizationId: session\.tenant\.organizationId/)
  })

  // An audit line must never become a second copy of the patient's record.
  it("no assessment content reaches audit metadata", () => {
    for (const src of [persist, service]) {
      const metadata = [...src.matchAll(/metadata: \{[^}]*\}/g)].map((m) => m[0])
      for (const m of metadata) {
        assert.doesNotMatch(m, /summary|overallBand|imageData|recommendation/i)
      }
    }
  })
})
