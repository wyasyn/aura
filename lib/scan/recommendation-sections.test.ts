import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatChatMessageBody } from "../chat/format-message-body"
import {
  RECOMMENDATION_SECTIONS,
  REPORT_SECTION_TITLES,
} from "./constants"

describe("RECOMMENDATION_SECTIONS", () => {
  it("exposes titles and descriptions for chat and report sections", () => {
    assert.equal(RECOMMENDATION_SECTIONS.everydayCare.title, "Everyday care")
    assert.match(
      RECOMMENDATION_SECTIONS.everydayCare.description,
      /habits/i,
    )
    assert.equal(
      RECOMMENDATION_SECTIONS.recommendedProducts.title,
      "Recommended products",
    )
    assert.match(
      RECOMMENDATION_SECTIONS.recommendedProducts.description,
      /Aurora Organics/i,
    )
  })

  it("keeps report section titles in sync with recommendation copy", () => {
    assert.equal(
      REPORT_SECTION_TITLES.everydayCare,
      RECOMMENDATION_SECTIONS.everydayCare.title,
    )
    assert.equal(
      REPORT_SECTION_TITLES.products,
      RECOMMENDATION_SECTIONS.recommendedProducts.title,
    )
  })
})

describe("formatChatMessageBody", () => {
  it("strips duplicate product prose when structured products are present", () => {
    const body = formatChatMessageBody(
      `## Morning Routine\n\n1. Cleanse\n\n## Recommended Aurora Products\n\n* [Toner](https://example.com): gentle`,
      {
        productRecommendations: [
          {
            id: "toner",
            name: "Toner",
            reason: "gentle",
            imageUrl: null,
            storeUrl: null,
          },
        ],
      },
    )

    assert.match(body, /Morning Routine/)
    assert.doesNotMatch(body, /Recommended Aurora Products/)
    assert.doesNotMatch(body, /\[Toner\]/)
  })
})
