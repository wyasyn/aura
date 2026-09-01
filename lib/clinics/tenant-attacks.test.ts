import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { afterEach, describe, it } from "node:test"

import { validateCustomDomain } from "@/lib/clinics/custom-domain"
import { extractSubdomain, validateSubdomain } from "@/lib/clinics/subdomain"
import {
  isTenantRequest,
  pinnedTenantCandidate,
  selectedTenantSubdomain,
} from "@/lib/clinics/tenant-request"

/**
 * Adversarial tests for tenant selection.
 *
 * Everything a request controls is hostile input: the Host header, the pin
 * cookie, and any identifier in a form payload. These exercise the pure
 * resolution rules directly. The parts that need a database — membership
 * status, forged record ids — are asserted structurally here and exercised
 * against the running application in the live matrix.
 */

const ROOT = "NEXT_PUBLIC_TENANT_ROOT_DOMAIN"
const REAL_ROOT = "aurora.app"

function withRoot(value: string | undefined) {
  if (value === undefined) delete process.env[ROOT]
  else process.env[ROOT] = value
}

afterEach(() => withRoot(undefined))

describe("attack: a pin cookie tries to override the host", () => {
  // The core guarantee. A cookie is browser-controlled; the subdomain is not.
  it("a rival pin loses to the host, in both directions", () => {
    withRoot(REAL_ROOT)
    assert.equal(
      selectedTenantSubdomain({
        host: `wellderm.${REAL_ROOT}`,
        pinnedTenant: "verifyclinic",
      }),
      "wellderm",
    )
    assert.equal(
      selectedTenantSubdomain({
        host: `verifyclinic.${REAL_ROOT}`,
        pinnedTenant: "wellderm",
      }),
      "verifyclinic",
    )
  })

  // Not merely lower priority — unreadable. This is what makes shipping the
  // fallback safe.
  it("a pin is inert at the apex once a root domain is configured", () => {
    withRoot(REAL_ROOT)
    assert.equal(
      selectedTenantSubdomain({ host: REAL_ROOT, pinnedTenant: "wellderm" }),
      null,
    )
    assert.equal(
      pinnedTenantCandidate({ host: REAL_ROOT, pinnedTenant: "wellderm" }),
      null,
    )
  })

  it("the pin is refused even when the host carries no tenant at all", () => {
    withRoot(REAL_ROOT)
    for (const host of ["aurora-git-branch.vercel.app", "192.168.1.5", "", null]) {
      assert.equal(
        pinnedTenantCandidate({ host, pinnedTenant: "wellderm" }),
        null,
        `pin must stay inert for host ${JSON.stringify(host)}`,
      )
    }
  })

  // Only where nothing in the host could ever name a tenant.
  it("the pin is honoured only with no root domain configured", () => {
    withRoot(undefined)
    assert.equal(
      pinnedTenantCandidate({
        host: "aurora-5spm-zeta.vercel.app",
        pinnedTenant: "wellderm",
      }),
      "wellderm",
    )
  })

  it("even then a real subdomain still beats it", () => {
    withRoot(undefined)
    assert.equal(
      selectedTenantSubdomain({
        host: "wellderm.localhost:3000",
        pinnedTenant: "verifyclinic",
      }),
      "wellderm",
    )
  })

  it("a blank or whitespace pin selects nothing", () => {
    withRoot(undefined)
    for (const pinnedTenant of ["", "   ", null, undefined]) {
      assert.equal(pinnedTenantCandidate({ host: "localhost", pinnedTenant }), null)
    }
  })
})

describe("attack: hosts that must never become a tenant", () => {
  it("the platform apex is not a tenant", () => {
    withRoot(REAL_ROOT)
    assert.equal(extractSubdomain(REAL_ROOT), null)
    assert.equal(extractSubdomain(`${REAL_ROOT}:443`), null)
  })

  it("reserved labels are refused", () => {
    withRoot(REAL_ROOT)
    for (const label of ["www", "api", "admin", "auth", "login", "billing", "staging"]) {
      assert.equal(
        extractSubdomain(`${label}.${REAL_ROOT}`),
        null,
        `${label} must never resolve to a tenant`,
      )
    }
  })

  // "a.b.root" is not a host we issued, so it is refused rather than guessed at.
  it("multi-label prefixes are refused rather than collapsed", () => {
    withRoot(REAL_ROOT)
    assert.equal(extractSubdomain(`foo.bar.${REAL_ROOT}`), null)
    assert.equal(extractSubdomain(`a.b.c.${REAL_ROOT}`), null)
  })

  // Without the "must end in the configured root" rule, a preview URL would be
  // read as a tenant named after the git branch.
  it("a host outside the root domain is never a subdomain tenant", () => {
    withRoot(REAL_ROOT)
    for (const host of [
      "aurora-git-branch-xyz.vercel.app",
      "192.168.1.5",
      "evil.com",
      `${REAL_ROOT}.evil.com`,
    ]) {
      assert.equal(extractSubdomain(host), null, `${host} must not name a tenant`)
    }
  })

  // The suffix check must not be a bare "contains".
  it("a lookalike host cannot impersonate the root domain", () => {
    withRoot(REAL_ROOT)
    assert.equal(extractSubdomain(`wellderm.not${REAL_ROOT}`), null)
    assert.equal(extractSubdomain(`wellderm.${REAL_ROOT}.evil.com`), null)
  })

  it("malformed and empty hosts select nothing", () => {
    withRoot(REAL_ROOT)
    for (const host of ["", null, undefined, ".", "..", `.${REAL_ROOT}`]) {
      assert.equal(extractSubdomain(host), null)
    }
  })
})

describe("attack: a subdomain is claimed that should not be available", () => {
  it("reserved labels cannot be registered", () => {
    for (const label of ["www", "api", "admin", "dashboard", "billing", "localhost"]) {
      assert.equal(validateSubdomain(label).ok, false, `${label} must be reserved`)
    }
  })

  it("a punycode-lookalike prefix is refused", () => {
    assert.equal(validateSubdomain("xn--evil").ok, false)
  })

  it("separators that would change the host shape are refused", () => {
    for (const raw of ["a.b", "has space", "under_score", "-leading", "trailing-", "up/down"]) {
      assert.equal(validateSubdomain(raw).ok, false, `${raw} must be refused`)
    }
  })
})

describe("attack: a clinic reaches for a domain that is not its own", () => {
  it("the platform root and every subdomain of it are refused", () => {
    withRoot(REAL_ROOT)
    for (const domain of [
      REAL_ROOT,
      `admin.${REAL_ROOT}`,
      `anything.${REAL_ROOT}`,
      `deep.nested.${REAL_ROOT}`,
    ]) {
      const result = validateCustomDomain(domain)
      assert.equal(result.ok, false, `${domain} must be refused`)
    }
  })

  it("localhost cannot be claimed", () => {
    assert.equal(validateCustomDomain("localhost").ok, false)
    assert.equal(validateCustomDomain("api.localhost").ok, false)
  })

  it("a host with a port is refused, being a different host than we serve", () => {
    assert.equal(validateCustomDomain("clinic.example.com:8443").ok, false)
  })

  it("a legitimate third-party domain is still accepted", () => {
    withRoot(REAL_ROOT)
    const result = validateCustomDomain("skin.myclinic.com")
    assert.equal(result.ok, true)
  })
})

describe("attack: an unverified or released domain tries to serve", () => {
  const tenant = readFileSync("lib/clinics/tenant.ts", "utf8")
  const authServer = readFileSync("lib/auth/server.ts", "utf8")
  const domainActions = readFileSync("lib/clinics/domain-actions.ts", "utf8")

  // Both host-to-tenant lookups gate on the proof. One of them omitting it
  // would serve a clinic on a host it may not control.
  it("an unverified domain resolves to nothing, in both lookups", () => {
    assert.match(tenant, /matchedBy === "customDomain" && !clinic\.customDomainVerifiedAt/)
    assert.match(authServer, /customDomainVerifiedAt \? byDomain\.organizationId : null/)
  })

  it("the verified flag is keyed to how the clinic was actually matched", () => {
    // Testing `!subdomain` instead would reject a pin-cookie match for failing
    // a custom-domain check that does not apply to it.
    assert.match(tenant, /matchedBy === "customDomain"/)
  })

  it("changing the domain clears the previous proof", () => {
    assert.match(domainActions, /customDomainVerifiedAt: null/)
  })

  it("removing the domain clears the token with it", () => {
    const fn = domainActions.match(
      /export async function removeClinicCustomDomainAction[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.match(fn[0], /customDomain: null/)
    assert.match(fn[0], /customDomainToken: null/)
  })

  // Uniqueness is enforced in the schema; the check here exists so the second
  // claimant gets a sentence, and it must not name the clinic holding it.
  it("a domain held by another clinic cannot be claimed", () => {
    assert.match(domainActions, /NOT: \{ id: session\.tenant\.clinicId \}/)
    assert.match(domainActions, /already in use/)
  })
})

describe("attack: a forged identifier in a request payload", () => {
  const adminActions = readFileSync("lib/admin/membership-actions.ts", "utf8")
  const memberActions = readFileSync("lib/clinics/member-actions.ts", "utf8")
  const tenantRecords = readFileSync("lib/clinics/tenant-records.ts", "utf8")
  const tenantScans = readFileSync("lib/scan/tenant-scans.ts", "utf8")
  const apiKeyActions = readFileSync("lib/clinics/api-key-actions.ts", "utf8")

  // The tenant never comes from the payload on a tenant path.
  it("no tenant-path action accepts an organizationId from the caller", () => {
    for (const [label, src] of [
      ["member-actions", memberActions],
      ["tenant-records", tenantRecords],
      ["tenant-scans", tenantScans],
      ["api-key-actions", apiKeyActions],
    ] as const) {
      for (const schema of src.matchAll(/z\.object\(\{[\s\S]*?\}\)/g)) {
        assert.doesNotMatch(
          schema[0],
          /organizationId/,
          `${label} must derive the tenant, not accept it`,
        )
      }
    }
  })

  // A forged record id must miss, not merely be checked afterwards.
  it("a forged record id is scoped away in the where clause itself", () => {
    assert.match(apiKeyActions, /where: \{ id: apiKeyId, organizationId: session\.scope/)
    assert.match(adminActions, /where: \{ id: memberId, organizationId \}/)
  })

  it("no tenant lookup reaches a row by id alone", () => {
    assert.doesNotMatch(adminActions, /member\.findUnique/)
  })

  // The admin path is the one place a tenant is named by the caller. It names
  // which tenant to act on; requireAdmin has already granted the right to act.
  it("the admin path authorizes before it reads the named tenant", () => {
    for (const fn of adminActions.matchAll(/export async function \w+\([\s\S]*?\n\}/g)) {
      const requireAt = fn[0].indexOf("requireAdmin()")
      const parseAt = fn[0].search(/\.parse\(input\)/)
      if (parseAt === -1) continue
      assert.ok(requireAt !== -1, "every admin action must call requireAdmin")
      assert.ok(
        requireAt < parseAt,
        "requireAdmin must run before the caller's organizationId is read",
      )
    }
  })
})

describe("attack: a session that should grant nothing", () => {
  const membership = readFileSync("lib/clinics/membership.ts", "utf8")

  it("a signed-out request is a guest, not a tenant member", () => {
    assert.match(membership, /if \(!auth\) return \{ kind: "guest" \}/)
  })

  it("a suspended or revoked membership is refused", () => {
    assert.match(membership, /member\.status !== "active"/)
    assert.match(membership, /kind: "membership_inactive"/)
  })

  it("a platform admin is not automatically a member", () => {
    assert.match(membership, /if \(!member\) return \{ kind: "not_a_member" \}/)
  })

  // A cookie selects a tenant; only a Member row joins one.
  it("the scope is minted only after an active membership is found", () => {
    const fn = membership.match(/export const resolveClinicSession[\s\S]*?\n\}\)/)
    assert.ok(fn)
    assert.ok(
      fn[0].indexOf("member.status !== \"active\"") < fn[0].indexOf("asTenantScope("),
      "the status check must precede the mint",
    )
  })
})

describe("TenantScope has exactly two mint points", () => {
  // A branded type is only worth having while the set of ways to obtain one
  // stays small enough to read. Both below are authentications, not shortcuts.
  it("membership resolution and API-key authentication, and nothing else", () => {
    const found: string[] = []
    for (const file of [
      "lib/clinics/membership.ts",
      "lib/api-keys/authenticate.ts",
      "lib/clinics/tenant.ts",
      "lib/clinics/tenant-records.ts",
      "lib/scan/tenant-scans.ts",
      "lib/admin/clinic-queries.ts",
      "lib/admin/membership-actions.ts",
      "lib/clinics/queries.ts",
    ]) {
      const src = readFileSync(file, "utf8")
      if (/as TenantScope|asTenantScope\(/.test(src)) found.push(file)
    }
    assert.deepEqual(found, [
      "lib/clinics/membership.ts",
      "lib/api-keys/authenticate.ts",
    ])
  })

  it("the API-key mint is gated on a verified key and an active tenant", () => {
    const src = readFileSync("lib/api-keys/authenticate.ts", "utf8")
    assert.match(src, /resolveClinicAccess/)
    assert.ok(
      src.indexOf("if (!access.ok)") < src.indexOf("as TenantScope"),
      "an inactive tenant must be refused before a scope is minted",
    )
  })

  // The control plane operates on tenants it is not a member of, so it must
  // never obtain one of these.
  it("admin queries never mint one", () => {
    const src = readFileSync("lib/admin/clinic-queries.ts", "utf8")
    assert.doesNotMatch(src, /asTenantScope|as TenantScope/)
  })
})

describe("attack: the proxy's custom-domain inference", () => {
  // isTenantRequest runs at the edge and cannot read the database, so with a
  // root domain configured it treats any unrecognised host as a *possible*
  // custom domain. resolveTenant, which can check, then 404s if it is not one.
  it("an unrecognised host is handed to the resolver rather than the platform", () => {
    withRoot(REAL_ROOT)
    assert.equal(
      isTenantRequest({ host: "clinic.example.com", pinnedTenant: null }),
      true,
    )
  })

  it("but the apex and its subdomains are still the platform", () => {
    withRoot(REAL_ROOT)
    assert.equal(isTenantRequest({ host: REAL_ROOT, pinnedTenant: null }), false)
    assert.equal(
      isTenantRequest({ host: `admin.${REAL_ROOT}`, pinnedTenant: null }),
      false,
    )
  })

  // Without a root domain the platform's own hosts are unknown, so the same
  // inference would make every host a tenant.
  it("the inference is skipped entirely with no root domain", () => {
    withRoot(undefined)
    assert.equal(
      isTenantRequest({ host: "clinic.example.com", pinnedTenant: null }),
      false,
    )
  })
})
