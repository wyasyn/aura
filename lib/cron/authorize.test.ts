import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { afterEach, describe, it } from "node:test"

import { authorizeCronRequest, presentedCronSecret } from "@/lib/cron/authorize"

/**
 * Scheduled-job authorisation.
 *
 * These endpoints delete audit rows and expired sessions, so the interesting
 * cases are the ones where authorisation should fail — an unset secret, a
 * near-miss, a header in the wrong shape — rather than the happy path.
 */

const SECRET = "correct-horse-battery-staple-cron-secret"
const saved = process.env.CRON_SECRET

afterEach(() => {
  if (saved === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = saved
})

function req(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/cron/purge-retention", { headers })
}

describe("reading the presented secret", () => {
  it("accepts a bearer token, which is what Vercel Cron sends", () => {
    assert.equal(
      presentedCronSecret(req({ authorization: `Bearer ${SECRET}` }).headers),
      SECRET,
    )
  })

  it("accepts the scheme in any case", () => {
    assert.equal(presentedCronSecret(req({ authorization: `bearer ${SECRET}` }).headers), SECRET)
    assert.equal(presentedCronSecret(req({ authorization: `BEARER ${SECRET}` }).headers), SECRET)
  })

  // RFC 7235 allows one or more spaces between the scheme and the token, so
  // absorbing extra whitespace is correct rather than lenient.
  it("tolerates extra whitespace between scheme and token", () => {
    assert.equal(presentedCronSecret(req({ authorization: `Bearer   ${SECRET}` }).headers), SECRET)
  })

  // For a scheduler that reserves Authorization for its own signing.
  it("accepts the dedicated header", () => {
    assert.equal(presentedCronSecret(req({ "x-cron-secret": SECRET }).headers), SECRET)
  })

  it("ignores a bearer header with no token", () => {
    assert.equal(presentedCronSecret(req({ authorization: "Bearer" }).headers), null)
    assert.equal(presentedCronSecret(req({ authorization: "Bearer   " }).headers), null)
  })

  it("ignores an unrecognised scheme", () => {
    assert.equal(presentedCronSecret(req({ authorization: `Basic ${SECRET}` }).headers), null)
    assert.equal(presentedCronSecret(req({ authorization: SECRET }).headers), null)
  })

  it("is null when nothing is presented", () => {
    assert.equal(presentedCronSecret(req({}).headers), null)
  })
})

describe("authorising a request", () => {
  it("accepts the correct secret in either header", async () => {
    process.env.CRON_SECRET = SECRET
    assert.equal(authorizeCronRequest(req({ authorization: `Bearer ${SECRET}` })).ok, true)
    assert.equal(authorizeCronRequest(req({ "x-cron-secret": SECRET })).ok, true)
  })

  it("refuses a wrong secret", () => {
    process.env.CRON_SECRET = SECRET
    const result = authorizeCronRequest(req({ authorization: "Bearer wrong" }))
    assert.equal(result.ok, false)
  })

  // The near-misses a length or prefix comparison would let through.
  it("refuses a prefix, a suffix and a one-character difference", () => {
    process.env.CRON_SECRET = SECRET
    for (const wrong of [
      SECRET.slice(0, -1),
      SECRET + "x",
      SECRET.replace(/.$/, "X"),
      SECRET.toUpperCase(),
      `${SECRET} extra`,
    ]) {
      assert.equal(
        authorizeCronRequest(req({ authorization: `Bearer ${wrong}` })).ok,
        false,
        `"${wrong}" must not authorise`,
      )
    }
  })

  /**
   * An unset secret must refuse, not wave the request through. Reading "unset"
   * as "open" would turn a missing environment variable into a public endpoint
   * that deletes audit rows.
   */
  it("refuses everything when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET
    assert.equal(authorizeCronRequest(req({ authorization: "Bearer anything" })).ok, false)
    assert.equal(authorizeCronRequest(req({})).ok, false)
  })

  it("refuses an empty configured secret", () => {
    process.env.CRON_SECRET = ""
    assert.equal(authorizeCronRequest(req({ authorization: "Bearer " })).ok, false)
  })

  it("answers 401 identically however it failed", async () => {
    process.env.CRON_SECRET = SECRET

    const cases = [
      authorizeCronRequest(req({})),
      authorizeCronRequest(req({ authorization: "Bearer wrong" })),
      authorizeCronRequest(req({ authorization: "Basic whatever" })),
    ]

    for (const result of cases) {
      assert.equal(result.ok, false)
      if (result.ok) continue
      assert.equal(result.response.status, 401)
      assert.deepEqual(await result.response.json(), { ok: false, error: "Unauthorized" })
    }
  })
})

describe("the comparison is constant time", () => {
  const source = readFileSync("lib/cron/authorize.ts", "utf8")

  it("uses timingSafeEqual rather than string equality", () => {
    assert.match(source, /timingSafeEqual/)
    assert.doesNotMatch(source, /presented === secret|secret === presented/)
  })

  // timingSafeEqual throws on unequal lengths, which would leak length through
  // an exception. Hashing first makes both sides 32 bytes whatever came in.
  it("equalises length by hashing before comparing", () => {
    const fn = source.match(/function secretsMatch[\s\S]*?\n\}/)
    assert.ok(fn)
    assert.match(fn[0], /createHash\("sha256"\)/)
    assert.ok(
      fn[0].indexOf("createHash") < fn[0].indexOf("timingSafeEqual"),
      "the hash must be taken before the comparison",
    )
  })
})

describe("both cron routes use the shared guard", () => {
  for (const route of [
    "app/api/cron/purge-retention/route.ts",
    "app/api/cron/sync-products/route.ts",
  ]) {
    it(`${route} authorises through it`, () => {
      const src = readFileSync(route, "utf8")
      assert.match(src, /authorizeCronRequest\(request\)/)
      // No private copy of the check left behind.
      assert.doesNotMatch(src, /CRON_SECRET/)
      assert.doesNotMatch(src, /authHeader/)
    })
  }
})
