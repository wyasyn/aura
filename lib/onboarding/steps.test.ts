import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  EMPTY_BRANCH_STATE,
  normalizeStoredStep,
  resolveNextStep,
  resolvePreviousStep,
  resolveStepSequence,
} from "./steps"

describe("resolveStepSequence", () => {
  it("skips the routine step when no concern implies a regimen", () => {
    const sequence = resolveStepSequence(EMPTY_BRANCH_STATE)
    assert.ok(!sequence.includes("routine"))
  })

  it("includes the routine step for a concern that implies one", () => {
    const sequence = resolveStepSequence({
      ...EMPTY_BRANCH_STATE,
      primaryConcerns: ["acne"],
    })
    assert.ok(sequence.includes("routine"))
  })

  it("skips the password step when the account already has one", () => {
    const sequence = resolveStepSequence({
      ...EMPTY_BRANCH_STATE,
      needsPassword: false,
    })
    assert.ok(!sequence.includes("password"))
  })

  it("always starts at welcome and ends at complete", () => {
    const sequence = resolveStepSequence(EMPTY_BRANCH_STATE)
    assert.equal(sequence[0], "welcome")
    assert.equal(sequence[sequence.length - 1], "complete")
  })
})

describe("resolveNextStep", () => {
  it("jumps over a branched-away step", () => {
    assert.equal(
      resolveNextStep("skin_concerns", EMPTY_BRANCH_STATE),
      "lifestyle",
    )
  })

  it("visits the routine step when it applies", () => {
    assert.equal(
      resolveNextStep("skin_concerns", {
        ...EMPTY_BRANCH_STATE,
        primaryConcerns: ["aging"],
      }),
      "routine",
    )
  })

  it("goes straight to complete when password is not needed", () => {
    assert.equal(
      resolveNextStep("location", {
        ...EMPTY_BRANCH_STATE,
        needsPassword: false,
      }),
      "complete",
    )
  })

  it("recovers when the current step was branched away mid-flow", () => {
    // The user reached `routine`, then went back and cleared their concerns.
    const next = resolveNextStep("routine", EMPTY_BRANCH_STATE)
    assert.equal(next, "lifestyle")
  })

  it("terminates at complete", () => {
    assert.equal(resolveNextStep("complete", EMPTY_BRANCH_STATE), "complete")
  })
})

describe("resolvePreviousStep", () => {
  it("returns null on the first step", () => {
    assert.equal(resolvePreviousStep("welcome", EMPTY_BRANCH_STATE), null)
  })

  it("skips back over a branched-away step", () => {
    assert.equal(
      resolvePreviousStep("lifestyle", EMPTY_BRANCH_STATE),
      "skin_concerns",
    )
  })
})

describe("normalizeStoredStep", () => {
  it("maps pre-restructure ids forward so accounts resume", () => {
    assert.equal(normalizeStoredStep("consent"), "welcome")
    assert.equal(normalizeStoredStep("skin"), "skin_type")
  })

  it("passes current ids through", () => {
    assert.equal(normalizeStoredStep("lifestyle"), "lifestyle")
  })

  it("falls back to welcome for anything unrecognised", () => {
    assert.equal(normalizeStoredStep("nonsense"), "welcome")
    assert.equal(normalizeStoredStep(null), "welcome")
  })
})
