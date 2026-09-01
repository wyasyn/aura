import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  brandNameOrPlatform,
  brandingStyle,
  contrastingForeground,
  normalizeHexColor,
} from "@/lib/clinics/branding"

const NO_BRANDING = {
  displayName: "Wellderm",
  logoUrl: null,
  primaryColor: null,
  accentColor: null,
  supportEmail: null,
}

describe("normalizeHexColor", () => {
  it("expands shorthand hex and lowercases", () => {
    assert.equal(normalizeHexColor("#ABC"), "#aabbcc")
  })

  it("passes through full hex", () => {
    assert.equal(normalizeHexColor("#2563EB"), "#2563eb")
  })

  it("rejects non-hex values", () => {
    assert.equal(normalizeHexColor("rebeccapurple"), null)
    assert.equal(normalizeHexColor("#12345"), null)
    assert.equal(normalizeHexColor(""), null)
  })
})

describe("contrastingForeground", () => {
  // The reason this exists: a pale brand colour would otherwise inherit the
  // platform's near-white --primary-foreground and be unreadable.
  it("picks dark text on a light brand colour", () => {
    assert.equal(contrastingForeground("#ffffff"), "#111111")
    assert.equal(contrastingForeground("#fde68a"), "#111111")
  })

  it("picks light text on a dark brand colour", () => {
    assert.equal(contrastingForeground("#000000"), "#ffffff")
    assert.equal(contrastingForeground("#1e3a8a"), "#ffffff")
  })

  it("falls back to light text for an invalid colour", () => {
    assert.equal(contrastingForeground("not-a-colour"), "#ffffff")
  })
})

describe("brandingStyle", () => {
  it("emits nothing when a clinic has set no colours", () => {
    assert.deepEqual(brandingStyle(NO_BRANDING), {})
  })

  it("maps the primary colour onto the theme variables it drives", () => {
    const style = brandingStyle({ ...NO_BRANDING, primaryColor: "#2563eb" }) as Record<
      string,
      string
    >
    assert.equal(style["--primary"], "#2563eb")
    assert.equal(style["--primary-foreground"], "#ffffff")
    assert.equal(style["--ring"], "#2563eb")
  })

  it("maps the accent colour independently of the primary", () => {
    const style = brandingStyle({ ...NO_BRANDING, accentColor: "#fde68a" }) as Record<
      string,
      string
    >
    assert.equal(style["--accent"], "#fde68a")
    assert.equal(style["--accent-foreground"], "#111111")
    assert.equal(style["--primary"], undefined)
  })

  it("ignores an invalid colour rather than emitting a broken variable", () => {
    assert.deepEqual(brandingStyle({ ...NO_BRANDING, primaryColor: "blue" }), {})
  })
})

describe("brandNameOrPlatform", () => {
  it("uses the clinic name when present", () => {
    assert.equal(brandNameOrPlatform({ displayName: "Wellderm" }), "Wellderm")
  })

  it("falls back to the platform for unbranded scans", () => {
    assert.equal(brandNameOrPlatform(null), "Aurora Organics")
    assert.equal(brandNameOrPlatform({ displayName: "   " }), "Aurora Organics")
  })
})
