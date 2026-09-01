import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

/**
 * Production tenancy guarantees.
 *
 * Asserted against source because these are properties of the *shape* of the
 * code — that one module expresses the precedence, that a secret is absent from
 * an audit entry, that a routing change is recorded at all. None can be shown
 * by calling a function with test data; the behavioural half is covered by
 * tenant-request.test.ts and custom-domain.test.ts.
 */

const domainActions = readFileSync("lib/clinics/domain-actions.ts", "utf8")
const apiKeyActions = readFileSync("lib/clinics/api-key-actions.ts", "utf8")
const tenantRequest = readFileSync("lib/clinics/tenant-request.ts", "utf8")
const customDomain = readFileSync("lib/clinics/custom-domain.ts", "utf8")

describe("one tenant resolver", () => {
  // Three call sites consume the precedence; none may restate it. A second
  // resolver that agrees today is the one that disagrees after the next edit.
  it("the precedence lives in tenant-request.ts", () => {
    assert.match(tenantRequest, /export function selectedTenantSubdomain/)
    assert.match(tenantRequest, /hostBasedTenancyConfigured\(\)/)
  })

  it("its three consumers call it rather than restating the order", () => {
    for (const file of ["proxy.ts", "lib/clinics/tenant.ts", "lib/auth/server.ts"]) {
      const src = readFileSync(file, "utf8")
      assert.match(src, /tenant-request/, `${file} must consume the shared helper`)
    }
  })

  // The pin is not merely lower priority than the host — once a root domain is
  // configured it is never read, so it cannot override subdomain routing.
  it("the pin cookie is unreachable once host tenancy is configured", () => {
    const fn = tenantRequest.match(
      /export function selectedTenantSubdomain[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.ok(
      fn[0].indexOf("hostBasedTenancyConfigured") < fn[0].indexOf("pinned"),
      "the configured-host check must short-circuit before the pin is consulted",
    )
  })
})

describe("custom domains cannot reach the platform's hosts", () => {
  it("the root domain and its subdomains are refused", () => {
    assert.match(customDomain, /platformRootDomain\(\)/)
    assert.match(customDomain, /domain === root \|\| domain\.endsWith\(`\.\$\{root\}`\)/)
  })

  it("ownership is proved against DNS, not asserted by the claimant", () => {
    assert.match(customDomain, /dns\.resolveTxt/)
  })

  // Both places that map a host to a tenant must require the proof. One of them
  // accepting an unverified domain would serve a clinic on a host it may not
  // control.
  it("both host-to-tenant lookups require verification", () => {
    for (const file of ["lib/clinics/tenant.ts", "lib/auth/server.ts"]) {
      assert.match(readFileSync(file, "utf8"), /customDomainVerifiedAt/)
    }
  })

  it("changing the domain clears the previous proof", () => {
    assert.match(domainActions, /customDomainVerifiedAt: null/)
  })
})

describe("routing changes are audited", () => {
  for (const action of [
    "tenant.domain_claimed",
    "tenant.domain_verified",
    "tenant.domain_removed",
  ]) {
    it(`records ${action}`, () => {
      assert.match(domainActions, new RegExp(`"${action.replace(/\./g, "\\.")}"`))
    })
  }

  it("records the refusals too, not only the successes", () => {
    assert.match(domainActions, /recordDenied/)
    assert.match(domainActions, /already_claimed/)
    assert.match(domainActions, /dns_proof_failed/)
  })

  // update() returns the row as it is *after* the write, so reading the
  // replaced domain from it would record the new value as the old one.
  it("the replaced domain is read before the write", () => {
    const fn = domainActions.match(
      /export async function setClinicCustomDomainAction[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.ok(
      fn[0].indexOf("findUnique") < fn[0].indexOf("clinicSettings.update"),
      "the previous domain must be read before it is overwritten",
    )
  })

  it("removal names the domain that stopped serving", () => {
    const fn = domainActions.match(
      /export async function removeClinicCustomDomainAction[\s\S]*?\n\}/,
    )
    assert.ok(fn)
    assert.match(fn[0], /wasVerified/)
  })
})

describe("api keys are audited without their material", () => {
  it("issuing and revoking are both recorded", () => {
    assert.match(apiKeyActions, /"apikey\.created"/)
    assert.match(apiKeyActions, /"apikey\.revoked"/)
  })

  it("an id from another tenant is refused and recorded", () => {
    assert.match(apiKeyActions, /recordDenied/)
    assert.match(apiKeyActions, /organizationId: session\.scope/)
  })
})

describe("secrets never reach an audit entry", () => {
  // The token is what proves ownership of a domain, and the plaintext key is
  // the credential itself. An audit log is read by more people than may use
  // either, so neither may appear in one.
  /**
   * The metadata object literals only. Matching the surrounding function would
   * flag the plaintext key on its way *out* of createClinicApiKeyAction, which
   * is the one place it is legitimately handled — returned once, never stored.
   */
  function metadataLiterals(src: string): string[] {
    return [...src.matchAll(/metadata: \{[^{}]*\}/g)].map((m) => m[0])
  }

  const forbidden: [string, RegExp][] = [
    ["domain verification token", /token/i],
    ["api key plaintext", /plaintext/i],
    ["api key hash", /hashedkey/i],
    ["password", /password/i],
    ["session or cookie", /session_token|cookie|authorization/i],
  ]

  for (const [label, src] of [
    ["domain-actions.ts", domainActions],
    ["api-key-actions.ts", apiKeyActions],
  ] as const) {
    const blocks = metadataLiterals(src)

    it(`${label} has metadata to check`, () => {
      assert.ok(blocks.length >= 2, `expected metadata literals in ${label}`)
    })

    for (const [what, pattern] of forbidden) {
      it(`${label} carries no ${what}`, () => {
        for (const block of blocks) {
          assert.doesNotMatch(block, pattern, `in ${label}: ${block}`)
        }
      })
    }
  }

  it("the plaintext key is returned to the caller but never persisted", () => {
    assert.match(apiKeyActions, /return \{ plaintext: issued\.plaintext/)
    assert.doesNotMatch(apiKeyActions, /data: \{[^}]*plaintext/)
  })

  it("the key prefix is what distinguishes two keys in a log", () => {
    assert.match(apiKeyActions, /keyPrefix: issued\.keyPrefix/)
  })
})
