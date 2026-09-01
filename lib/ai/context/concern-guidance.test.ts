import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildProfileConcernPromptBlock,
  collectProfileWellnessPriorities,
} from "@/lib/ai/context/concern-guidance"

describe("buildProfileConcernPromptBlock", () => {
  it("degrades to a short instruction when no profile is on file", () => {
    const block = buildProfileConcernPromptBlock(null)
    assert.match(block, /No stated concerns or goals on file/)
  })

  it("leaves grounding and recommendation rules to the system prompt", () => {
    // These rules are stated once, in buildSystemPrompt. Restating them here
    // dilutes both copies, so the per-user block must stay scoped to mapping.
    const block = buildProfileConcernPromptBlock({
      ageBand: null,
      skinType: null,
      fitzpatrickBand: null,
      skinDosha: null,
      primaryConcerns: ["acne"],
      skinGoals: [],
      allergies: null,
      currentRoutine: null,
      lifestyleFactors: [],
    })

    assert.doesNotMatch(block, /Photo-first analysis/)
    assert.doesNotMatch(block, /Recommendation rules/)
  })

  it("includes acne concern mapping and summary requirement", () => {
    const block = buildProfileConcernPromptBlock({
      ageBand: "25_34",
      skinType: "oily",
      fitzpatrickBand: "iv",
      skinDosha: "pitta",
      primaryConcerns: ["acne", "oiliness"],
      skinGoals: ["clear_skin"],
      allergies: null,
      currentRoutine: null,
      lifestyleFactors: [],
    })

    assert.match(block, /blemishes, breakout-prone areas, congestion/)
    assert.match(block, /excess sebum, shine, oil balance/)
    assert.match(block, /blemish and congestion patterns/)
    assert.match(
      block,
      /Account for every one of these exactly once: acne, oiliness/,
    )
    assert.match(block, /the rest go in concernsNotVisible/)
  })
})

describe("collectProfileWellnessPriorities", () => {
  it("merges concerns and goals without duplicates", () => {
    assert.deepEqual(
      collectProfileWellnessPriorities({
        ageBand: null,
        skinType: null,
        fitzpatrickBand: null,
        skinDosha: null,
        primaryConcerns: ["acne", "redness"],
        skinGoals: ["clear_skin", "hydration"],
        allergies: null,
        currentRoutine: null,
        lifestyleFactors: [],
      }),
      ["acne", "redness", "clear_skin", "hydration"],
    )
  })
})
