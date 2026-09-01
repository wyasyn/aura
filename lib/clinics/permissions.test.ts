import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  PLATFORM_ADMIN_TENANT_PERMISSIONS,
  TENANT_PERMISSIONS,
  can,
  hasPermission,
  permissionsForTenantRole,
  requirePermission,
} from "@/lib/clinics/permissions"

const ctx = (role: string | null) => ({
  permissions: permissionsForTenantRole(role),
})

describe("role to permission matrix", () => {
  it("owner holds every tenant permission", () => {
    const owner = permissionsForTenantRole("owner")
    for (const p of TENANT_PERMISSIONS) {
      assert.ok(hasPermission(owner, p), `owner should hold ${p}`)
    }
  })

  it("member can read but not manage", () => {
    const m = ctx("member")
    assert.equal(can(m, "PATIENT_VIEW"), true)
    assert.equal(can(m, "SCAN_VIEW"), true)
    assert.equal(can(m, "APPOINTMENT_VIEW"), true)

    assert.equal(can(m, "MEMBERS_MANAGE"), false)
    assert.equal(can(m, "TENANT_MANAGE"), false)
    assert.equal(can(m, "API_KEY_MANAGE"), false)
    assert.equal(can(m, "PAYMENT_VIEW"), false)
  })

  it("clinic admin manages the tenant but is not the owner", () => {
    const a = ctx("admin")
    assert.equal(can(a, "MEMBERS_MANAGE"), true)
    assert.equal(can(a, "TENANT_MANAGE"), true)
    assert.equal(can(a, "PAYMENT_VIEW"), true)
  })

  // A role the organization plugin might add must not silently lock existing
  // staff out of their own clinic, nor silently grant management.
  it("an unknown role falls back to the member set", () => {
    const unknown = ctx("dermatologist")
    assert.equal(can(unknown, "PATIENT_VIEW"), true)
    assert.equal(can(unknown, "MEMBERS_MANAGE"), false)
  })

  it("no role grants nothing", () => {
    assert.deepEqual(permissionsForTenantRole(null), [])
    assert.deepEqual(permissionsForTenantRole(undefined), [])
    assert.equal(can(ctx(null), "PATIENT_VIEW"), false)
  })
})

describe("platform admin inside a tenant", () => {
  // Reaching a clinic's site is not membership. Anything an administrator
  // genuinely needs across tenants belongs in the admin control plane behind
  // requireAdmin, where it is visible as such.
  it("holds no tenant permissions by virtue of being an admin", () => {
    assert.deepEqual(PLATFORM_ADMIN_TENANT_PERMISSIONS, [])
    assert.equal(
      hasPermission(PLATFORM_ADMIN_TENANT_PERMISSIONS, "PATIENT_VIEW"),
      false,
    )
  })
})

describe("requirePermission", () => {
  it("passes when allowed", () => {
    assert.doesNotThrow(() => requirePermission(ctx("owner"), "PATIENT_VIEW"))
  })

  it("throws when denied, naming the permission", () => {
    assert.throws(
      () => requirePermission(ctx("member"), "MEMBERS_MANAGE"),
      /MEMBERS_MANAGE/,
    )
  })
})
