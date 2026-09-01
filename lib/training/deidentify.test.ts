import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  DEIDENT_VERSION,
  deidentifyScan,
  findIdentifierLeaks,
} from "@/lib/training/deidentify"

/**
 * A scan carrying every identifier the real snapshots can hold, so the tests
 * assert on removal rather than on absence that happened to be true.
 */
function scanWithIdentifiers() {
  return {
    createdAt: new Date("2026-08-19T14:23:51.123Z"),
    captureMode: "still",
    profileSnapshot: {
      ageBand: "age_25_34",
      skinType: "combination",
      fitzpatrickBand: "III",
      skinDosha: "pitta",
      primaryConcerns: ["acne", "redness"],
      skinGoals: ["clearer skin"],
      // Not part of the allowlist.
      name: "Jane Patient",
      email: "jane@example.com",
      notes: "lives above the pharmacy on Mill Street",
    },
    locationSnapshot: {
      city: "Karachi",
      region: "Central",
      country: "UG",
      climateZone: "tropical",
      seasonBand: "wet",
      uvIndexBand: "high",
      humidityBand: "high",
      temperatureBand: "moderate",
    },
    result: {
      overallBand: "moderate",
      dimensions: { hydration: "moderate", redness: "mild" },
      doshaTyping: { pitta: 0.6 },
      summary: "Jane's skin shows redness around the nose.",
    },
    feedback: { rating: 4, message: "I am Jane and I live in Karachi" },
  }
}

describe("deidentifyScan", () => {
  it("keeps the coarse signal worth learning from", () => {
    const result = deidentifyScan(scanWithIdentifiers())
    assert.equal(result.ok, true)
    if (!result.ok) return

    assert.equal(result.payload.profile.ageBand, "age_25_34")
    assert.equal(result.payload.profile.skinType, "combination")
    assert.deepEqual(result.payload.profile.primaryConcerns, ["acne", "redness"])
    assert.equal(result.payload.assessment.overallBand, "moderate")
    assert.equal(result.payload.environment.uvIndexBand, "high")
    assert.equal(result.payload.context.patientRating, 4)
    assert.equal(result.version, DEIDENT_VERSION)
  })

  it("drops direct identifiers carried on the profile snapshot", () => {
    const result = deidentifyScan(scanWithIdentifiers())
    assert.equal(result.ok, true)
    if (!result.ok) return

    const serialised = JSON.stringify(result.payload)
    assert.ok(!serialised.includes("Jane"), "a name must not survive")
    assert.ok(!serialised.includes("jane@example.com"), "an email must not survive")
    assert.ok(!serialised.includes("Mill Street"), "stray free text must not survive")
  })

  it("coarsens location to country, dropping city and region", () => {
    const result = deidentifyScan(scanWithIdentifiers())
    assert.equal(result.ok, true)
    if (!result.ok) return

    assert.equal(result.payload.environment.country, "UG")
    const serialised = JSON.stringify(result.payload)
    assert.ok(!serialised.includes("Karachi"), "city must not survive")
    assert.ok(!serialised.includes("Central"), "region must not survive")
  })

  it("coarsens the timestamp to year and month", () => {
    const result = deidentifyScan(scanWithIdentifiers())
    assert.equal(result.ok, true)
    if (!result.ok) return

    assert.equal(result.payload.context.scanMonth, "2026-08")
    assert.ok(
      !JSON.stringify(result.payload).includes("14:23"),
      "the exact time must not survive",
    )
  })

  it("drops all free text, including the model's own summary", () => {
    const result = deidentifyScan(scanWithIdentifiers())
    assert.equal(result.ok, true)
    if (!result.ok) return

    const serialised = JSON.stringify(result.payload)
    assert.ok(!serialised.includes("redness around the nose"))
    assert.ok(!serialised.includes("I am Jane"), "feedback text must not survive")
  })

  // The allowlist's whole purpose: a field nobody has considered stays out.
  it("ignores fields added to a snapshot later", () => {
    const scan = scanWithIdentifiers()
    ;(scan.profileSnapshot as Record<string, unknown>).newlyAddedNationalId =
      "CM-99-1234"

    const result = deidentifyScan(scan)
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.ok(!JSON.stringify(result.payload).includes("CM-99-1234"))
  })

  it("strips non-strings hidden inside array fields", () => {
    const scan = scanWithIdentifiers()
    ;(scan.profileSnapshot as Record<string, unknown>).primaryConcerns = [
      "acne",
      { email: "sneaky@example.com" },
    ]

    const result = deidentifyScan(scan)
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.payload.profile.primaryConcerns, ["acne"])
  })

  it("refuses a scan with no assessment", () => {
    const scan = { ...scanWithIdentifiers(), result: null }
    const result = deidentifyScan(scan)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, "no_result")
  })

  it("produces a payload the leak scanner accepts", () => {
    const result = deidentifyScan(scanWithIdentifiers())
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(findIdentifierLeaks(result.payload), [])
  })
})

describe("findIdentifierLeaks", () => {
  it("catches an email", () => {
    assert.ok(findIdentifierLeaks({ note: "reach me at a@b.com" }).length > 0)
  })

  it("catches record ids", () => {
    assert.ok(findIdentifierLeaks({ id: "cmsyhlrjq0000m4uqc4wqa2ts" }).length > 0)
    assert.ok(
      findIdentifierLeaks({ id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" }).length > 0,
    )
  })

  it("catches an exact timestamp", () => {
    assert.ok(findIdentifierLeaks({ at: "2026-08-19T14:23:51Z" }).length > 0)
  })

  it("catches forbidden field names", () => {
    assert.ok(findIdentifierLeaks({ city: "Karachi" }).length > 0)
    assert.ok(findIdentifierLeaks({ summary: "anything" }).length > 0)
  })

  it("passes a clean payload", () => {
    assert.deepEqual(
      findIdentifierLeaks({ ageBand: "age_25_34", scanMonth: "2026-08" }),
      [],
    )
  })
})
