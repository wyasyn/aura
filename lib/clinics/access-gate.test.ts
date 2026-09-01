import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  activeMemberships,
  belongsToTenant,
  decideAccess,
  hasAnyClinicTie,
  tenantRoleIn,
  type ClinicAffiliation,
} from "@/lib/clinics/access-rules"

const A = "org_clinic_a"
const B = "org_clinic_b"

function affiliation(over: Partial<ClinicAffiliation> = {}): ClinicAffiliation {
  return {
    userId: "usr_1",
    role: "user",
    memberships: [],
    patientOrganizationId: null,
    ...over,
  }
}

const member = (organizationId: string, role = "member", status = "active") =>
  ({ organizationId, role, status }) as ClinicAffiliation["memberships"][number]

describe("membership sets", () => {
  // The regression this rewrite exists for. Resolution used `take: 1`, so a
  // person in two clinics was pinned to whichever row came back first and
  // refused at the other.
  it("recognises a user who belongs to several tenants", () => {
    const a = affiliation({ memberships: [member(A), member(B)] })
    assert.equal(belongsToTenant(a, A), true)
    assert.equal(belongsToTenant(a, B), true)
    assert.equal(decideAccess(a, A).allowed, true)
    assert.equal(decideAccess(a, B).allowed, true)
  })

  it("counts a patient tie as belonging", () => {
    const a = affiliation({ patientOrganizationId: A })
    assert.equal(belongsToTenant(a, A), true)
    assert.equal(belongsToTenant(a, B), false)
  })

  it("has no tie when there are no memberships at all", () => {
    assert.equal(hasAnyClinicTie(affiliation()), false)
    assert.equal(activeMemberships(affiliation()).length, 0)
  })
})

describe("membership status gates access", () => {
  for (const status of ["suspended", "revoked", "invited"] as const) {
    it(`a ${status} membership grants nothing`, () => {
      const a = affiliation({ memberships: [member(A, "owner", status)] })
      assert.equal(belongsToTenant(a, A), false)
      assert.equal(decideAccess(a, A).allowed, false)
      assert.equal(tenantRoleIn(a, A), null)
    })
  }

  it("an active membership alongside a revoked one still grants its own tenant", () => {
    const a = affiliation({
      memberships: [member(A, "owner", "revoked"), member(B, "member", "active")],
    })
    assert.equal(decideAccess(a, A).allowed, false)
    assert.equal(decideAccess(a, B).allowed, true)
  })

  // Revocation must not read as "no account here" to the revoked person, but
  // it must not confirm the account either. Same message as a stranger.
  it("a user whose only tie is revoked is treated as unaffiliated", () => {
    const a = affiliation({ memberships: [member(A, "owner", "revoked")] })
    const decision = decideAccess(a, A)
    assert.equal(decision.allowed, false)
    assert.equal(decision.allowed === false && decision.reason, "not_a_clinic_user")
    // …and is therefore free to use the platform, having no live clinic tie.
    assert.equal(decideAccess(a, null).allowed, true)
  })
})

describe("tenant isolation", () => {
  it("refuses a member of one clinic on another", () => {
    const a = affiliation({ memberships: [member(A)] })
    const decision = decideAccess(a, B)
    assert.equal(decision.allowed, false)
    assert.equal(decision.allowed === false && decision.reason, "other_clinic")
  })

  it("refuses a clinic account on the platform host", () => {
    const a = affiliation({ memberships: [member(A)] })
    const decision = decideAccess(a, null)
    assert.equal(decision.allowed, false)
    assert.equal(decision.allowed === false && decision.reason, "clinic_user_on_platform")
  })

  it("refuses a platform account on a clinic", () => {
    const decision = decideAccess(affiliation(), A)
    assert.equal(decision.allowed, false)
    assert.equal(decision.allowed === false && decision.reason, "not_a_clinic_user")
  })

  it("admits a platform account on the platform", () => {
    assert.equal(decideAccess(affiliation(), null).allowed, true)
  })
})

describe("platform admin", () => {
  // Sign-in access only. decideAccess governs which site an account may
  // authenticate on; it does not grant tenant data. resolveClinicSession
  // still requires a real active Member row, and this asymmetry is deliberate.
  it("may sign in on any tenant and on the platform", () => {
    const admin = affiliation({ role: "admin" })
    assert.equal(decideAccess(admin, A).allowed, true)
    assert.equal(decideAccess(admin, B).allowed, true)
    assert.equal(decideAccess(admin, null).allowed, true)
  })

  it("is still not a member of anything", () => {
    const admin = affiliation({ role: "admin" })
    assert.equal(belongsToTenant(admin, A), false)
    assert.equal(tenantRoleIn(admin, A), null)
  })
})

describe("tenantRoleIn", () => {
  it("returns the role held in that tenant, not another", () => {
    const a = affiliation({
      memberships: [member(A, "owner"), member(B, "member")],
    })
    assert.equal(tenantRoleIn(a, A), "owner")
    assert.equal(tenantRoleIn(a, B), "member")
    assert.equal(tenantRoleIn(a, "org_other"), null)
  })
})
