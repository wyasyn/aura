import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { extractSubdomain, validateSubdomain } from "@/lib/clinics/subdomain"

describe("validateSubdomain", () => {
  it("accepts a normal subdomain and lowercases it", () => {
    const result = validateSubdomain("  WellDerm  ")
    assert.deepEqual(result, { ok: true, subdomain: "wellderm" })
  })

  it("accepts internal hyphens and digits", () => {
    assert.equal(validateSubdomain("well-derm-2").ok, true)
  })

  it("rejects reserved labels", () => {
    const result = validateSubdomain("admin")
    assert.equal(result.ok, false)
  })

  it("rejects leading and trailing hyphens", () => {
    assert.equal(validateSubdomain("-wellderm").ok, false)
    assert.equal(validateSubdomain("wellderm-").ok, false)
  })

  it("rejects anything too short or too long", () => {
    assert.equal(validateSubdomain("ab").ok, false)
    assert.equal(validateSubdomain("a".repeat(64)).ok, false)
  })

  it("rejects punycode-style prefixes and dots", () => {
    assert.equal(validateSubdomain("xn--abc").ok, false)
    assert.equal(validateSubdomain("a.b").ok, false)
  })
})

describe("extractSubdomain", () => {
  it("returns null without a host", () => {
    assert.equal(extractSubdomain(null), null)
    assert.equal(extractSubdomain(""), null)
  })

  it("reads a tenant from a .localhost host, ignoring the port", () => {
    assert.equal(extractSubdomain("wellderm.localhost:3000"), "wellderm")
    assert.equal(extractSubdomain("WellDerm.localhost"), "wellderm")
  })

  it("treats bare localhost as the platform", () => {
    assert.equal(extractSubdomain("localhost:3000"), null)
  })

  describe("with a configured root domain", () => {
    const original = process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN

    function withRoot(root: string, run: () => void) {
      process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN = root
      try {
        run()
      } finally {
        process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN = original
      }
    }

    it("reads a tenant from the root domain", () => {
      withRoot("aurora.app", () => {
        assert.equal(extractSubdomain("wellderm.aurora.app"), "wellderm")
      })
    })

    it("treats the apex domain itself as the platform", () => {
      withRoot("aurora.app", () => {
        assert.equal(extractSubdomain("aurora.app"), null)
        assert.equal(extractSubdomain("www.aurora.app"), null)
      })
    })

    // The case that would otherwise route a preview deployment to a
    // non-existent tenant named after the deployment.
    it("ignores hosts outside the root domain, including Vercel previews", () => {
      withRoot("aurora.app", () => {
        assert.equal(
          extractSubdomain("aura-git-feature-stripe-abc123-wyasyns-projects.vercel.app"),
          null,
        )
        assert.equal(extractSubdomain("evil.com"), null)
      })
    })

    it("rejects multi-label prefixes we never issued", () => {
      withRoot("aurora.app", () => {
        assert.equal(extractSubdomain("a.b.aurora.app"), null)
      })
    })
  })

  it("treats a tenant host as the platform when no root domain is set", () => {
    const original = process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN
    delete process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN
    try {
      assert.equal(extractSubdomain("wellderm.aurora.app"), null)
    } finally {
      process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN = original
    }
  })
})
