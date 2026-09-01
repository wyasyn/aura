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
 * Patient and appointment tenant isolation.
 *
 * The decision half is exercised directly. The structural half — that no tenant
 * id can arrive from a caller, and that no lookup reads a row before checking
 * whose it is — is asserted against the source, because both guarantees are
 * about the *shape* of a query rather than its result.
 *
 * Cross-tenant behaviour against a real database is covered by
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

describe("patient access follows membership", () => {
  it("Clinic A staff reach Clinic A", () => {
    const a = affiliation({ memberships: [member(A)] })
    assert.equal(decideAccess(a, A).allowed, true)
    assert.equal(can({ permissions: permissionsForTenantRole("member") }, "PATIENT_VIEW"), true)
  })

  it("Clinic A staff are refused Clinic B", () => {
    assert.equal(belongsToTenant(affiliation({ memberships: [member(A)] }), B), false)
  })

  it("Clinic B staff are refused Clinic A", () => {
    assert.equal(belongsToTenant(affiliation({ memberships: [member(B)] }), A), false)
  })

  for (const status of ["suspended", "revoked"] as const) {
    it(`a ${status} member of Clinic A cannot read its patients`, () => {
      const a = affiliation({ memberships: [member(A, "owner", status)] })
      assert.equal(belongsToTenant(a, A), false)
      assert.equal(decideAccess(a, A).allowed, false)
    })
  }

  it("a platform user with no membership reaches no clinic", () => {
    assert.equal(belongsToTenant(affiliation(), A), false)
    assert.equal(decideAccess(affiliation(), A).allowed, false)
  })

  // Phase 2 rule, restated here because patient data is the thing it protects.
  it("a platform admin is not a member of any clinic", () => {
    const admin = affiliation({ role: "admin" })
    assert.equal(belongsToTenant(admin, A), false)
    assert.equal(belongsToTenant(admin, B), false)
  })
})

describe("multi-membership sees one tenant at a time", () => {
  const both = affiliation({ memberships: [member(A, "admin"), member(B, "member")] })

  it("belongs to both, and to nothing else", () => {
    assert.equal(belongsToTenant(both, A), true)
    assert.equal(belongsToTenant(both, B), true)
    assert.equal(belongsToTenant(both, "org_clinic_c"), false)
  })

  // The role is per tenant, so the same person may manage one clinic and only
  // read another. Which one applies is decided by the resolved tenant, never by
  // the account.
  it("carries a different role in each", () => {
    const inA = { permissions: permissionsForTenantRole("admin") }
    const inB = { permissions: permissionsForTenantRole("member") }
    assert.equal(can(inA, "MEMBERS_MANAGE"), true)
    assert.equal(can(inB, "MEMBERS_MANAGE"), false)
    assert.equal(can(inA, "PATIENT_VIEW"), true)
    assert.equal(can(inB, "PATIENT_VIEW"), true)
  })
})

describe("appointment permissions", () => {
  it("every member role may view appointments", () => {
    for (const role of ["owner", "admin", "member"]) {
      assert.equal(
        can({ permissions: permissionsForTenantRole(role) }, "APPOINTMENT_VIEW"),
        true,
        `${role} should hold APPOINTMENT_VIEW`,
      )
    }
  })

  it("only owner and clinic admin may manage them", () => {
    assert.equal(can({ permissions: permissionsForTenantRole("owner") }, "APPOINTMENT_MANAGE"), true)
    assert.equal(can({ permissions: permissionsForTenantRole("admin") }, "APPOINTMENT_MANAGE"), true)
    assert.equal(can({ permissions: permissionsForTenantRole("member") }, "APPOINTMENT_MANAGE"), false)
  })
})

describe("no tenant id can arrive from a caller", () => {
  const service = readFileSync("lib/clinics/tenant-records.ts", "utf8")

  for (const fn of [
    "listPatientsForCurrentTenant",
    "listAppointmentsForCurrentTenant",
  ]) {
    it(`${fn} accepts no organizationId`, () => {
      const sig = service.match(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\)`))
      assert.ok(sig, `expected ${fn} to inspect`)
      assert.doesNotMatch(sig[0], /organizationId|tenantId/)
    })
  }

  // The booking id is caller-supplied and therefore untrusted; the tenant is
  // not. The id may be a parameter, the tenant may never be.
  it("getAppointmentForCurrentTenant takes only the booking id", () => {
    const sig = service.match(
      /export async function getAppointmentForCurrentTenant\([\s\S]*?\)/,
    )
    assert.ok(sig)
    assert.match(sig[0], /bookingId: string/)
    assert.doesNotMatch(sig[0], /organizationId|tenantId/)
  })

  it("the tenant comes from the resolved session", () => {
    assert.match(service, /requireClinicMember\(\)/)
    assert.match(service, /session\.scope/)
    assert.doesNotMatch(service, /asTenantScope/)
  })

  it("permissions are asserted, not assumed", () => {
    assert.match(service, /requirePermission\(session, "PATIENT_VIEW"\)/)
    assert.match(service, /requirePermission\(session, "APPOINTMENT_VIEW"\)/)
  })
})

describe("tenant-owned lookups filter before they read", () => {
  const queries = readFileSync("lib/clinics/queries.ts", "utf8")

  it("the scoped queries take a TenantScope, not a string", () => {
    assert.match(queries, /listClinicPatients\(organizationId: TenantScope/)
    assert.match(queries, /listClinicAppointments\(\s*organizationId: TenantScope/)
    assert.match(queries, /findClinicAppointment\(\s*organizationId: TenantScope/)
  })

  // findUnique on an id alone reads the row and leaves the ownership check to
  // whatever the caller remembers to do afterwards. By then another tenant's
  // record is already in memory.
  it("the single-appointment lookup is findFirst with the scope in the where", () => {
    const fn = queries.match(/export async function findClinicAppointment[\s\S]*?\n\}/)
    assert.ok(fn, "expected findClinicAppointment to inspect")
    assert.match(fn[0], /findFirst/)
    assert.doesNotMatch(fn[0], /findUnique/)
    assert.match(fn[0], /where: \{ id: bookingId, organizationId \}/)
  })
})

describe("audit records actor, tenant and outcome", () => {
  const service = readFileSync("lib/clinics/tenant-records.ts", "utf8")
  const booking = readFileSync("lib/experts/booking-actions.ts", "utf8")

  it("a refused appointment lookup is recorded as denied", () => {
    const denied = service.match(/recordDenied\(\{[\s\S]*?action: "appointment\.viewed"[\s\S]*?\}\)/)
    assert.ok(denied, "expected a denied entry for a cross-tenant lookup")
    assert.match(denied[0], /actorId: session\.userId/)
    assert.match(denied[0], /organizationId: session\.tenant\.organizationId/)
  })

  it("appointment.created carries actor and tenant", () => {
    const entry = booking.match(/action: "appointment\.created"[\s\S]*?\}\)/)
    assert.ok(entry)
    assert.match(entry[0], /actorId: session\.user\.id/)
    assert.match(entry[0], /organizationId/)
  })

  // Names, emails and appointment notes are the thing being protected.
  it("no patient identity or clinical content reaches audit metadata", () => {
    for (const src of [service, booking]) {
      for (const m of src.matchAll(/metadata: \{[^}]*\}/g)) {
        assert.doesNotMatch(m[0], /patientName|patientEmail|\bnotes\b|email|summary/i)
      }
    }
  })
})
