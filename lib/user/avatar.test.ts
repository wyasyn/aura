import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import {
  AVATAR_MAX_BYTES,
  avatarUrl,
  checkAvatar,
  isUploadedAvatar,
  sniffImageType,
} from "@/lib/user/avatar"

/**
 * Profile picture validation.
 *
 * The rules are pure, so the interesting cases — a file lying about what it is,
 * a script renamed to .png — are exercised directly rather than through an
 * upload.
 */

const jpeg = (extra = 16) => new Uint8Array([0xff, 0xd8, 0xff, ...Array(extra).fill(0)])
const png = (extra = 16) =>
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(extra).fill(0)])
const webp = () =>
  new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0,
  ])

describe("the format is decided by the bytes, not the label", () => {
  it("recognises the three accepted formats", () => {
    assert.equal(sniffImageType(jpeg()), "image/jpeg")
    assert.equal(sniffImageType(png()), "image/png")
    assert.equal(sniffImageType(webp()), "image/webp")
  })

  it("recognises nothing else", () => {
    // A GIF, a PDF, an SVG and a shell script — all plausible uploads, none
    // of which should be stored and served back as an image.
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')
    const script = new TextEncoder().encode("#!/bin/sh\nrm -rf /\n")

    for (const bytes of [gif, pdf, svg, script]) {
      assert.equal(sniffImageType(bytes), null)
    }
  })

  // The attack this exists for: a file that says image/png and is not.
  it("refuses a script that claims to be a PNG", () => {
    const result = checkAvatar({
      bytes: new TextEncoder().encode("<?php system($_GET['c']); ?>"),
      declaredType: "image/png",
    })
    assert.equal(result.ok, false)
  })

  it("refuses a real image whose declared type disagrees with it", () => {
    const result = checkAvatar({ bytes: jpeg(), declaredType: "image/png" })
    assert.equal(result.ok, false)
    assert.match(result.ok === false ? result.error : "", /does not match/)
  })

  // A browser that sends no type at all is not lying, so the bytes decide.
  it("accepts a real image with no declared type", () => {
    const result = checkAvatar({ bytes: png(), declaredType: null })
    assert.equal(result.ok, true)
    assert.equal(result.ok === true ? result.mimeType : null, "image/png")
  })

  it("accepts a real image whose declared type agrees", () => {
    const result = checkAvatar({ bytes: webp(), declaredType: "image/webp" })
    assert.equal(result.ok, true)
  })
})

describe("size", () => {
  it("refuses an empty file", () => {
    assert.equal(checkAvatar({ bytes: new Uint8Array(), declaredType: "image/png" }).ok, false)
  })

  it("refuses anything over the limit", () => {
    const tooBig = jpeg(AVATAR_MAX_BYTES)
    const result = checkAvatar({ bytes: tooBig, declaredType: "image/jpeg" })
    assert.equal(result.ok, false)
    assert.match(result.ok === false ? result.error : "", /2 MB or smaller/)
  })

  it("accepts a file at the limit", () => {
    const atLimit = jpeg(AVATAR_MAX_BYTES - 3)
    assert.equal(atLimit.byteLength, AVATAR_MAX_BYTES)
    assert.equal(checkAvatar({ bytes: atLimit, declaredType: "image/jpeg" }).ok, true)
  })
})

describe("the stored image value", () => {
  // A new picture must be a new URL, or the browser keeps showing the old one.
  it("carries the update time so a new upload is a new URL", () => {
    const first = avatarUrl("user-1", new Date(1000))
    const second = avatarUrl("user-1", new Date(2000))
    assert.notEqual(first, second)
    assert.match(first, /^\/api\/avatar\/user-1\?v=1000$/)
  })

  it("is distinguishable from a federated URL", () => {
    assert.equal(isUploadedAvatar(avatarUrl("user-1", new Date())), true)
    assert.equal(isUploadedAvatar("https://lh3.googleusercontent.com/a/abc"), false)
    assert.equal(isUploadedAvatar(null), false)
  })
})

describe("the upload writes only the caller's own row", () => {
  const actions = readFileSync("lib/user/avatar-actions.ts", "utf8")
  const route = readFileSync("app/api/avatar/[userId]/route.ts", "utf8")

  it("addresses the row by the session, never by the payload", () => {
    assert.match(actions, /where: \{ id: session\.user\.id \}/)
    assert.doesNotMatch(actions, /where: \{ id: (input|parsed|formData)/)
  })

  it("re-checks the file on the server", () => {
    assert.match(actions, /checkAvatar\(/)
  })

  // Removing an uploaded picture must not also discard the one a federated
  // sign-in supplied, which this action never stored and cannot restore.
  it("clears the image only when it was ours", () => {
    assert.match(actions, /isUploadedAvatar\(current\.image\)/)
  })

  it("the serving route requires a session", () => {
    assert.match(route, /requireApiSession\(\)/)
  })

  it("serves the stored type and forbids sniffing", () => {
    assert.match(route, /"Content-Type": user\.avatarMimeType/)
    assert.match(route, /"X-Content-Type-Options": "nosniff"/)
  })

  it("caches privately rather than publicly", () => {
    assert.match(route, /Cache-Control": "private/)
  })
})
