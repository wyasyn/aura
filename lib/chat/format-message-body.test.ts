import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { stripDuplicateRecommendationProse } from "./format-message-body"
import type { ChatMessageMetadata } from "./types"

const metadata: ChatMessageMetadata = {
  naturalRecommendations: [
    {
      id: "oat_cleanse",
      title: "Gentle oat cleanse",
      description: "Wash with a colloidal oat cleanser.",
      applicationTime: "morning",
      applicationFrequency: "once_daily",
    },
    {
      id: "humidifier",
      title: "Run a bedroom humidifier",
      description: "Keeps overnight moisture loss down.",
      applicationTime: "evening",
      applicationFrequency: "once_daily",
    },
  ],
  productRecommendations: [
    {
      id: "aurora-calm-serum",
      name: "Aurora Calm Serum",
      reason: "Soothes visible redness.",
    },
  ],
}

describe("stripDuplicateRecommendationProse", () => {
  it("removes the canonical natural and product sections", () => {
    const body = [
      "Here is a plan for your dry patches.",
      "",
      "## Everyday Care",
      "- Gentle oat cleanse each morning",
      "- Run a bedroom humidifier overnight",
      "",
      "## Recommended Products",
      "- [Aurora Calm Serum](https://example.com) after cleansing",
    ].join("\n")

    const result = stripDuplicateRecommendationProse(body, metadata)

    assert.equal(result, "Here is a plan for your dry patches.")
  })

  it("removes sections the heading regex does not know about", () => {
    const body = [
      "Quick routine below.",
      "",
      "## Daily Habits",
      "- Gentle oat cleanse each morning",
      "- Run a bedroom humidifier overnight",
    ].join("\n")

    const result = stripDuplicateRecommendationProse(body, metadata)

    assert.equal(result, "Quick routine below.")
  })

  it("handles h3 sub-headings and bold pseudo-headings", () => {
    const body = [
      "### Your Routine",
      "- Gentle oat cleanse each morning",
      "",
      "**Products to try**",
      "- Aurora Calm Serum in the evening",
      "",
      "Let me know how your skin responds.",
    ].join("\n")

    const result = stripDuplicateRecommendationProse(body, metadata)

    assert.equal(result, "Let me know how your skin responds.")
  })

  it("removes an unheaded list that restates the structured items", () => {
    const body = [
      "Two things to start with:",
      "- Gentle oat cleanse each morning",
      "- Run a bedroom humidifier overnight",
      "- Drink water through the day",
    ].join("\n")

    const result = stripDuplicateRecommendationProse(body, metadata)

    assert.equal(
      result,
      ["Two things to start with:", "- Drink water through the day"].join("\n\n"),
    )
  })

  it("drops indented detail lines along with their list item", () => {
    const body = [
      "1. Gentle oat cleanse",
      "  - Use lukewarm water only",
      "2. Pat dry with a soft towel",
    ].join("\n")

    const result = stripDuplicateRecommendationProse(body, metadata)

    assert.equal(result, "2. Pat dry with a soft towel")
  })

  it("leaves a casual reply with no structured cards untouched", () => {
    const body = "Glad that helped! Want to look at evenings next?"

    assert.equal(stripDuplicateRecommendationProse(body, null), body)
    assert.equal(stripDuplicateRecommendationProse(body, {}), body)
  })

  it("keeps prose that does not restate any structured item", () => {
    const body = [
      "## Why your skin feels tight",
      "Low humidity pulls moisture from the surface layer.",
    ].join("\n")

    const result = stripDuplicateRecommendationProse(body, metadata)

    assert.equal(result, body.replace("\n", "\n\n"))
  })
})
