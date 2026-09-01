import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  filterCatalogRecommendations,
  selectCatalogRecommendations,
} from "./validate-catalog-recommendations"

const rec = (id: string) => ({ id, name: id, reason: "because" })

describe("selectCatalogRecommendations", () => {
  it("separates catalog slugs from invented ones", () => {
    const result = selectCatalogRecommendations(
      [rec("aurora-cleanser"), rec("made-up-serum"), rec("aurora-moisturizer")],
      new Set(["aurora-cleanser", "aurora-moisturizer"]),
    )

    assert.deepEqual(
      result.valid.map((item) => item.id),
      ["aurora-cleanser", "aurora-moisturizer"],
    )
    assert.deepEqual(result.invalidSlugs, ["made-up-serum"])
  })

  it("caps the valid set at the max", () => {
    const slugs = ["a", "b", "c", "d", "e"]
    const result = selectCatalogRecommendations(
      slugs.map(rec),
      new Set(slugs),
      { max: 3 },
    )

    assert.equal(result.valid.length, 3)
  })

  it("reports no failures for an all-valid set", () => {
    const result = selectCatalogRecommendations(
      [rec("a"), rec("b")],
      new Set(["a", "b"]),
    )

    assert.deepEqual(result.invalidSlugs, [])
  })
})

describe("filterCatalogRecommendations", () => {
  it("throws below the minimum valid count", () => {
    assert.throws(
      () => filterCatalogRecommendations([rec("nope")], new Set(["a", "b"])),
      /invalid product recommendations/,
    )
  })

  it("returns the valid subset when the minimum is met", () => {
    const result = filterCatalogRecommendations(
      [rec("a"), rec("nope"), rec("b")],
      new Set(["a", "b"]),
    )

    assert.deepEqual(
      result.map((item) => item.id),
      ["a", "b"],
    )
  })
})
