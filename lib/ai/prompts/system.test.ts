import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  DIMENSION_BAND_CRITERIA,
  SKIN_DIMENSIONS,
} from "@/lib/scan/dimensions"

import { buildSystemPrompt } from "./system"

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt()

  it("carries observable criteria for every dimension and band", () => {
    for (const dimension of SKIN_DIMENSIONS) {
      assert.ok(
        prompt.includes(dimension.id),
        `missing calibration for ${dimension.id}`,
      )

      for (const band of ["minimal", "mild", "moderate", "elevated"] as const) {
        assert.ok(
          prompt.includes(DIMENSION_BAND_CRITERIA[dimension.id][band]),
          `missing ${band} criteria for ${dimension.id}`,
        )
      }
    }
  })

  it("states the allergy rule", () => {
    assert.match(prompt, /Never recommend a product whose ingredientList/)
  })

  it("states each grounding rule once", () => {
    // The old prompt restated photo-first grounding five times, which is what
    // the rewrite was for. Guard against the duplication creeping back.
    const groundingMentions = prompt.match(/attached photo/gi) ?? []
    assert.ok(
      groundingMentions.length <= 2,
      `grounding restated ${groundingMentions.length} times`,
    )
  })

  it("does not restate enums the response schema already pins", () => {
    // applicationTime/applicationFrequency values appear once, in the defaults
    // table, not as a separate "use exact values" rule.
    const enumMentions = prompt.match(/morning_and_evening/g) ?? []
    assert.ok(enumMentions.length <= 1)
  })
})
