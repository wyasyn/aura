import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatRecommendedActivesForPrompt } from "./format-actives"
import type { RecommendedActive } from "./types"

describe("formatRecommendedActivesForPrompt", () => {
  it("formats active ingredient lines for AI context", () => {
    const text = formatRecommendedActivesForPrompt([
      {
        inciName: "Niacinamide",
        displayName: "Niacinamide",
        reasons: ["Matches concerns: oiliness"],
        score: 3,
      },
    ])

    assert.match(text, /Niacinamide/)
    assert.match(text, /oiliness/)
  })

  it("returns fallback when no actives match", () => {
    const text = formatRecommendedActivesForPrompt([])
    assert.match(text, /No structured ingredient actives matched/)
  })
})
