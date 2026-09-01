import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  generateVerificationToken,
  validateCustomDomain,
} from "@/lib/clinics/custom-domain"

describe("validateCustomDomain", () => {
  it("accepts a normal subdomain and apex", () => {
    assert.deepEqual(validateCustomDomain("skin.myclinic.com"), {
      ok: true,
      domain: "skin.myclinic.com",
    })
    assert.deepEqual(validateCustomDomain("myclinic.com"), {
      ok: true,
      domain: "myclinic.com",
    })
  })

  it("normalises what people actually paste", () => {
    for (const input of [
      "  HTTPS://Skin.MyClinic.com/  ",
      "http://skin.myclinic.com",
      "skin.myclinic.com.",
      "skin.myclinic.com/some/path",
    ]) {
      const result = validateCustomDomain(input)
      assert.equal(result.ok, true, `expected ${input} to be accepted`)
      if (result.ok) assert.equal(result.domain, "skin.myclinic.com")
    }
  })

  it("rejects malformed input", () => {
    for (const input of ["", "   ", "not a domain", "no-tld", "-bad.com", "a..b.com"]) {
      assert.equal(
        validateCustomDomain(input).ok,
        false,
        `expected ${JSON.stringify(input)} to be rejected`,
      )
    }
  })

  it("rejects a host with a port, which would be a different host than served", () => {
    assert.equal(validateCustomDomain("skin.myclinic.com:8443").ok, false)
  })

  it("asks for the bare domain rather than www", () => {
    const result = validateCustomDomain("www.myclinic.com")
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.error, /without www/i)
  })

  it("rejects localhost", () => {
    assert.equal(validateCustomDomain("localhost").ok, false)
    assert.equal(validateCustomDomain("evil.localhost").ok, false)
  })

  // The important one: claiming the platform's own domain, or a subdomain of
  // it, would let a clinic intercept the platform or another tenant.
  it("rejects the platform's own domain when one is configured", (t) => {
    const original = process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN
    process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN = "aurora.app"
    t.after(() => {
      process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN = original
    })

    assert.equal(validateCustomDomain("aurora.app").ok, false)
    assert.equal(validateCustomDomain("rival.aurora.app").ok, false)
    // A domain that merely ends in similar characters is still fine.
    assert.equal(validateCustomDomain("not-aurora.app").ok, true)
    assert.equal(validateCustomDomain("myclinic.com").ok, true)
  })
})

describe("generateVerificationToken", () => {
  it("is prefixed and unguessable", () => {
    const token = generateVerificationToken()
    assert.match(token, /^aurora-verify-[0-9a-f]{32}$/)
  })

  it("never repeats", () => {
    const tokens = new Set(
      Array.from({ length: 200 }, () => generateVerificationToken()),
    )
    assert.equal(tokens.size, 200)
  })
})
