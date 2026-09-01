import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"

import {
  configuredOrigin,
  getConfiguredOrigins,
  getConfiguredTrustedOrigins,
  getSiteUrl,
  isConfiguredOrigin,
} from "@/lib/site-url"

/**
 * Origin resolution and the trust allowlist.
 *
 * On Vercel the platform injects VERCEL_URL and its siblings, so matching a
 * request's Host against them proved ownership. Self-hosted there is nothing
 * equivalent — the Host header is whatever the client sent — so trust comes
 * from configuration and nothing else. These pin both halves: that the
 * precedence is what it claims, and that an unconfigured deployment refuses an
 * unknown origin instead of trusting it.
 */

const VARS = [
  "BETTER_AUTH_URL",
  "APP_URL",
  "TRUSTED_ORIGINS",
  "NEXT_PUBLIC_VERCEL_URL",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "PORT",
] as const

const saved = new Map<string, string | undefined>()
for (const key of VARS) saved.set(key, process.env[key])

function env(values: Partial<Record<(typeof VARS)[number], string>>) {
  for (const key of VARS) delete process.env[key]
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value
  }
}

afterEach(() => {
  for (const key of VARS) {
    const original = saved.get(key)
    if (original === undefined) delete process.env[key]
    else process.env[key] = original
  }
})

describe("getSiteUrl precedence", () => {
  it("BETTER_AUTH_URL wins over everything", () => {
    env({
      BETTER_AUTH_URL: "https://pinned.example.com",
      APP_URL: "https://app.example.com",
      NEXT_PUBLIC_VERCEL_URL: "preview.vercel.app",
    })
    assert.equal(getSiteUrl(), "https://pinned.example.com")
  })

  it("APP_URL wins when BETTER_AUTH_URL is unset", () => {
    env({ APP_URL: "https://app.example.com", NEXT_PUBLIC_VERCEL_URL: "preview.vercel.app" })
    assert.equal(getSiteUrl(), "https://app.example.com")
  })

  it("falls to the Vercel alias when neither is set", () => {
    env({ NEXT_PUBLIC_VERCEL_URL: "preview.vercel.app" })
    assert.equal(getSiteUrl(), "https://preview.vercel.app")
  })

  it("falls to localhost when nothing is set", () => {
    env({})
    assert.equal(getSiteUrl(), "http://localhost:3000")
  })

  it("honours PORT in the localhost fallback", () => {
    env({ PORT: "8080" })
    assert.equal(getSiteUrl(), "http://localhost:8080")
  })

  it("normalises a bare host and strips any path", () => {
    env({ APP_URL: "app.example.com/some/path" })
    assert.equal(getSiteUrl(), "https://app.example.com")
  })

  // Only the Vercel step changes; a self-hosted deployment is already stable.
  it("preferStableAlias picks the production alias on Vercel", () => {
    env({ VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app", VERCEL_URL: "dep.vercel.app" })
    assert.equal(getSiteUrl({ preferStableAlias: true }), "https://prod.vercel.app")
  })

  it("preferStableAlias changes nothing when APP_URL is set", () => {
    env({ APP_URL: "https://app.example.com", VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app" })
    assert.equal(getSiteUrl({ preferStableAlias: true }), "https://app.example.com")
  })
})

describe("TRUSTED_ORIGINS parsing", () => {
  it("is empty when unset", () => {
    env({})
    assert.deepEqual(getConfiguredTrustedOrigins(), [])
  })

  it("splits, trims and normalises", () => {
    env({ TRUSTED_ORIGINS: " https://a.example.com , b.example.com ,https://c.example.com/x " })
    assert.deepEqual(getConfiguredTrustedOrigins(), [
      "https://a.example.com",
      "https://b.example.com",
      "https://c.example.com",
    ])
  })

  it("drops entries that are not parseable", () => {
    env({ TRUSTED_ORIGINS: "https://ok.example.com,,   ," })
    assert.deepEqual(getConfiguredTrustedOrigins(), ["https://ok.example.com"])
  })
})

describe("the configured origin set", () => {
  it("always contains the canonical origin", () => {
    env({ APP_URL: "https://app.example.com" })
    assert.ok(getConfiguredOrigins().includes("https://app.example.com"))
  })

  it("contains the Vercel aliases only when they are present", () => {
    env({ APP_URL: "https://app.example.com" })
    assert.deepEqual(getConfiguredOrigins(), ["https://app.example.com"])

    env({
      APP_URL: "https://app.example.com",
      VERCEL_URL: "dep.vercel.app",
      VERCEL_BRANCH_URL: "branch.vercel.app",
    })
    const withVercel = getConfiguredOrigins()
    assert.ok(withVercel.includes("https://dep.vercel.app"))
    assert.ok(withVercel.includes("https://branch.vercel.app"))
  })

  it("never contains duplicates", () => {
    env({ APP_URL: "https://app.example.com", TRUSTED_ORIGINS: "https://app.example.com" })
    assert.deepEqual(getConfiguredOrigins(), ["https://app.example.com"])
  })
})

describe("a request-derived origin is trusted only when configured", () => {
  // The Phase 2 acceptance case: APP_URL set, no Vercel vars, a Host that
  // differs must be refused.
  it("refuses a Host that differs from APP_URL", () => {
    env({ APP_URL: "https://app.example.com" })
    assert.equal(isConfiguredOrigin("https://app.example.com"), true)
    assert.equal(isConfiguredOrigin("https://evil.example.com"), false)
  })

  it("accepts an origin named in TRUSTED_ORIGINS", () => {
    env({ APP_URL: "https://app.example.com", TRUSTED_ORIGINS: "https://alt.example.com" })
    assert.equal(isConfiguredOrigin("https://alt.example.com"), true)
  })

  // With nothing configured the set is still non-empty — it holds the localhost
  // fallback — so an unknown origin is refused rather than trusted. The failure
  // mode is "cannot sign in", not "anyone may name themselves the origin".
  it("fails closed when nothing is configured", () => {
    env({})
    assert.equal(isConfiguredOrigin("https://anything.example.com"), false)
    assert.equal(isConfiguredOrigin("http://localhost:3000"), true)
  })

  // No wildcards, no prefix or suffix matching. These are the shapes that turn
  // one allowlist entry into every domain an attacker can register.
  it("matches whole origins only", () => {
    env({ APP_URL: "https://aurora.app" })

    for (const candidate of [
      "https://evil-aurora.app",
      "https://aurora.app.evil.com",
      "https://aurora.apple",
      "https://sub.aurora.app",
      "https://aurora.app:8443",
    ]) {
      assert.equal(
        isConfiguredOrigin(candidate),
        false,
        `${candidate} must not match https://aurora.app`,
      )
    }
  })

  /**
   * A downgraded scheme on a real host matches — non-localhost origins are
   * normalised to https before comparison — but what comes back, and therefore
   * what is trusted, is the https form. Returning the caller's own string here
   * would quietly add a plaintext origin to better-auth's trusted set on any
   * request carrying X-Forwarded-Proto: http.
   */
  it("never hands back a downgraded scheme", () => {
    env({ APP_URL: "https://aurora.app" })
    assert.equal(configuredOrigin("http://aurora.app"), "https://aurora.app")
    assert.equal(configuredOrigin("https://aurora.app"), "https://aurora.app")
  })

  it("leaves localhost on http, where there is no proxy to downgrade", () => {
    env({ APP_URL: "http://localhost:3000" })
    assert.equal(configuredOrigin("http://localhost:3000"), "http://localhost:3000")
  })

  it("returns null rather than a value for an origin it does not trust", () => {
    env({ APP_URL: "https://aurora.app" })
    assert.equal(configuredOrigin("https://evil.example.com"), null)
  })

  it("refuses unparseable candidates", () => {
    env({ APP_URL: "https://app.example.com" })
    for (const candidate of ["", "   ", "://", "not a url at all"]) {
      assert.equal(isConfiguredOrigin(candidate), false)
    }
  })
})
