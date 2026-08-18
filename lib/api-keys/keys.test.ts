import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  apiKeyHashMatches,
  extractBearerKey,
  hashApiKey,
  issueApiKey,
  KEY_PREFIX,
} from "@/lib/api-keys/keys"
import { checkRateLimit } from "@/lib/api-keys/rate-limit"

describe("issueApiKey", () => {
  it("issues a prefixed key whose hash matches", () => {
    const issued = issueApiKey()
    assert.ok(issued.plaintext.startsWith(KEY_PREFIX))
    assert.equal(issued.hashedKey, hashApiKey(issued.plaintext))
  })

  // The stored prefix is for identifying a key in the UI. If it were long
  // enough to be useful to an attacker, storing it would undo the hashing.
  it("stores only a short, non-recoverable prefix", () => {
    const issued = issueApiKey()
    assert.ok(issued.keyPrefix.length < issued.plaintext.length / 2)
    assert.ok(issued.plaintext.startsWith(issued.keyPrefix))
  })

  it("never issues the same key twice", () => {
    const keys = new Set(Array.from({ length: 200 }, () => issueApiKey().plaintext))
    assert.equal(keys.size, 200)
  })
})

describe("apiKeyHashMatches", () => {
  it("matches identical hashes", () => {
    const hash = hashApiKey("aur_sk_example")
    assert.equal(apiKeyHashMatches(hash, hash), true)
  })

  it("rejects different hashes", () => {
    assert.equal(
      apiKeyHashMatches(hashApiKey("aur_sk_a"), hashApiKey("aur_sk_b")),
      false,
    )
  })

  it("rejects mismatched lengths without throwing", () => {
    assert.equal(apiKeyHashMatches("short", hashApiKey("aur_sk_a")), false)
  })
})

describe("extractBearerKey", () => {
  it("reads a well-formed bearer token", () => {
    assert.equal(extractBearerKey("Bearer aur_sk_abc"), "aur_sk_abc")
    assert.equal(extractBearerKey("bearer aur_sk_abc"), "aur_sk_abc")
  })

  it("rejects a missing or non-bearer header", () => {
    assert.equal(extractBearerKey(null), null)
    assert.equal(extractBearerKey("Basic abc"), null)
  })

  // Anything without our prefix cannot be one of our keys, so it is rejected
  // before it ever reaches a database lookup.
  it("rejects a token that is not one of our keys", () => {
    assert.equal(extractBearerKey("Bearer sk_live_stripe_looking"), null)
  })
})

describe("checkRateLimit", () => {
  it("allows requests under the limit and counts down", () => {
    const key = `test-${Math.random()}`
    const first = checkRateLimit(key)
    const second = checkRateLimit(key)

    assert.equal(first.allowed, true)
    assert.equal(second.allowed, true)
    assert.equal(second.remaining, first.remaining - 1)
  })

  it("blocks once the window is exhausted", () => {
    const key = `test-${Math.random()}`
    let last = checkRateLimit(key)
    for (let i = 0; i < last.limit + 5; i++) {
      last = checkRateLimit(key)
    }

    assert.equal(last.allowed, false)
    assert.equal(last.remaining, 0)
  })

  it("counts each key independently", () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`

    for (let i = 0; i < 10; i++) checkRateLimit(a)
    const bResult = checkRateLimit(b)

    assert.equal(bResult.remaining, bResult.limit - 1)
  })
})
