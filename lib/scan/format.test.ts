import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatSkinHeadline } from "./format"
import type { AssessmentBand, SkinDimension } from "./types"

function dimensions(
  bands: Partial<Record<string, AssessmentBand>>,
): SkinDimension[] {
  const ids = [
    "texture_pores",
    "pigmentation",
    "redness",
    "wrinkles",
    "hydration",
    "aging_spots",
  ] as const

  return ids.map((id) => ({
    id,
    label: id,
    band: bands[id] ?? "minimal",
    note: "",
  }))
}

describe("formatSkinHeadline", () => {
  it("names the dimension driving the band", () => {
    assert.equal(
      formatSkinHeadline("elevated", dimensions({ texture_pores: "elevated" })),
      "Visible congestion is the clearest pattern in this scan, worth prioritizing in your routine",
    )
  })

  it("names two dimensions when they tie, with plural agreement", () => {
    assert.equal(
      formatSkinHeadline(
        "moderate",
        dimensions({ pigmentation: "moderate", wrinkles: "moderate" }),
      ),
      "Uneven tone and fine lines stand out most in this scan, worth addressing in your routine",
    )
  })

  it("caps the named dimensions at two", () => {
    const headline = formatSkinHeadline(
      "moderate",
      dimensions({
        texture_pores: "moderate",
        pigmentation: "moderate",
        redness: "moderate",
      }),
    )
    assert.equal(
      headline,
      "Visible congestion and uneven tone stand out most in this scan, worth addressing in your routine",
    )
  })

  it("reads the most severe dimensions, not the overall band", () => {
    // overallBand is raised a step when any dimension is elevated, so an
    // elevated overall can sit on moderate dimensions.
    assert.equal(
      formatSkinHeadline("elevated", dimensions({ hydration: "moderate" })),
      "Surface dryness is the clearest pattern in this scan, worth prioritizing in your routine",
    )
  })

  it("ignores dimensions at minimal and not_assessed", () => {
    assert.equal(
      formatSkinHeadline(
        "mild",
        dimensions({ redness: "mild", wrinkles: "not_assessed" }),
      ),
      "Mostly balanced, with visible redness the main thing to watch",
    )
  })

  it("falls back to band copy when nothing stands out", () => {
    assert.equal(
      formatSkinHeadline("moderate", dimensions({})),
      "Some visible cosmetic patterns worth addressing in your routine",
    )
  })

  it("falls back to band copy at minimal and not_assessed", () => {
    assert.equal(
      formatSkinHeadline("minimal", dimensions({ texture_pores: "moderate" })),
      "Generally balanced with negligible visible concerns",
    )
    assert.equal(
      formatSkinHeadline("not_assessed", dimensions({})),
      "Not fully assessed in this scan",
    )
  })

  it("keeps the band-only copy when no dimensions are supplied", () => {
    assert.equal(
      formatSkinHeadline("elevated"),
      "More noticeable cosmetic patterns worth prioritizing in your routine",
    )
  })
})
