import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  resolveActiveWorkspace,
  type WorkspaceCapabilities,
} from "@/lib/dashboard/nav"

const admin: WorkspaceCapabilities = {
  isAdmin: true,
  isExpert: false,
  isAffiliate: false,
  isClinicMember: false,
}

const plain: WorkspaceCapabilities = {
  isAdmin: false,
  isExpert: false,
  isAffiliate: false,
  isClinicMember: false,
}

const affiliateAdmin: WorkspaceCapabilities = {
  isAdmin: true,
  isExpert: false,
  isAffiliate: true,
  isClinicMember: false,
}

describe("resolveActiveWorkspace", () => {
  // The regression this function exists for. resolveWorkspace falls back to
  // the first available workspace and personal is always first, so without the
  // path an administrator arriving on /admin with no stored preference lost
  // every administration nav item while the page itself rendered fine.
  it("follows the path when there is no stored preference", () => {
    assert.equal(resolveActiveWorkspace(admin, null, "/admin").id, "admin")
    assert.equal(
      resolveActiveWorkspace(admin, undefined, "/admin/clinics").id,
      "admin",
    )
  })

  it("follows the path when the stored preference does not contain it", () => {
    assert.equal(
      resolveActiveWorkspace(admin, "personal", "/admin/clinics").id,
      "admin",
    )
    assert.equal(
      resolveActiveWorkspace(affiliateAdmin, "admin", "/affiliate/earnings").id,
      "affiliate",
    )
  })

  // /admin/models and /admin/training belong to both Administration and AI
  // operations. Following the path unconditionally would tip an AI-operations
  // user back into Administration on their own pages.
  it("keeps a stored workspace that already contains the path", () => {
    assert.equal(
      resolveActiveWorkspace(admin, "ai_ops", "/admin/training").id,
      "ai_ops",
    )
    assert.equal(
      resolveActiveWorkspace(admin, "ai_ops", "/admin/models").id,
      "ai_ops",
    )
    assert.equal(
      resolveActiveWorkspace(admin, "admin", "/admin/training").id,
      "admin",
    )
  })

  // /scan carries no nav entry in any workspace, so there is nothing for the
  // path to say and the stored preference stands.
  it("keeps the stored workspace on a path that belongs to none", () => {
    assert.equal(resolveActiveWorkspace(admin, "admin", "/scan").id, "admin")
    assert.equal(
      resolveActiveWorkspace(admin, "ai_ops", "/some/unknown/page").id,
      "ai_ops",
    )
  })

  // /settings is a personal-account page and does carry a nav entry there, so
  // an administrator who opens it sees the personal sidebar. The cookie is not
  // rewritten by navigating, so returning to /admin restores Administration.
  it("follows the path onto a personal page, without losing the preference", () => {
    assert.equal(resolveActiveWorkspace(admin, "admin", "/settings").id, "personal")
    assert.equal(resolveActiveWorkspace(admin, "admin", "/admin").id, "admin")
  })

  // A stored preference is a cookie, and the cookie is not httpOnly. It must
  // never widen what is shown beyond what the caller actually holds.
  it("ignores a stored workspace the caller does not hold", () => {
    assert.equal(resolveActiveWorkspace(plain, "admin", "/dashboard").id, "personal")
  })

  // The path must not widen it either. A non-admin who types /admin gets their
  // own navigation, not the administration menu — the route guard refuses them
  // separately, but the sidebar must not advertise it.
  it("ignores a path the caller has no workspace for", () => {
    assert.equal(resolveActiveWorkspace(plain, null, "/admin/clinics").id, "personal")
  })

  it("prefers the more specific workspace for a shared prefix", () => {
    // Nothing stored, so the path decides. /admin/training is reachable from
    // both; Administration is offered first and wins the tie.
    assert.equal(
      resolveActiveWorkspace(admin, null, "/admin/training").id,
      "admin",
    )
  })
})
