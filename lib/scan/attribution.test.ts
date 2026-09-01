import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

/**
 * Every scan must record both who took it and which clinic it was taken on.
 *
 * Those two together are what make an action auditable. A platform
 * administrator is allowed onto every tenant, so a scan taken while working
 * inside a clinic carries that clinic's organizationId alongside the
 * administrator's own userId — drop either and you can no longer answer "who
 * did this, and on whose site".
 *
 * Asserted against the source rather than by running a scan: the row is only
 * written after a successful model call, so an integration test here would need
 * a real photograph and a live AI request.
 */

// The single live write path. lib/scan/actions.ts held a second one until it
// was removed as unreachable: nothing imported it, and it was absent from the
// server-reference manifest, so it had no action id to be called by.
const WRITE_PATHS = ["lib/scan/persist-scan-result.ts"]

describe("scan attribution", () => {
  for (const path of WRITE_PATHS) {
    const source = readFileSync(path, "utf8")

    it(`${path} resolves the tenant organization`, () => {
      assert.match(
        source,
        /getTenantOrganizationIdSafe\(\)/,
        "must resolve the clinic through the shared tenant helper",
      )
    })

    it(`${path} writes userId and organizationId together`, () => {
      const create = source.match(/scan\.create\(\{\s*data:\s*\{[\s\S]*?\n {8}\}/)
      assert.ok(create, "expected a scan.create call to inspect")

      assert.match(create[0], /userId:/, "scan must record who took it")
      // Shorthand property, so no colon: this matches `organizationId,` and
      // not `organizationId: null,`. Line-ending agnostic — sources are CRLF.
      assert.match(
        create[0],
        /\borganizationId,/,
        "scan must record the clinic it was taken on",
      )
    })
  }

  it("no write path hardcodes a null organization", () => {
    for (const path of WRITE_PATHS) {
      const source = readFileSync(path, "utf8")
      assert.doesNotMatch(
        source,
        /organizationId:\s*null/,
        `${path} must resolve the tenant rather than discard it`,
      )
    }
  })
})
