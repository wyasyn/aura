import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  formatCompactNumber,
  formatExactNumber,
  getCompactNumberDisplay,
  shouldCompactNumber,
} from "@/lib/format/compact-number"

describe("compact-number", () => {
  it("formats exact numbers with grouping", () => {
    assert.equal(formatExactNumber(1234567), "1,234,567")
  })

  it("does not compact values below the threshold", () => {
    assert.equal(shouldCompactNumber(999), false)
    assert.equal(formatCompactNumber(999), "999")
    assert.equal(getCompactNumberDisplay(999).showTooltip, false)
  })

  it("compacts thousands", () => {
    assert.equal(shouldCompactNumber(1500), true)
    assert.equal(formatCompactNumber(1500), "1.5K")
    assert.equal(getCompactNumberDisplay(1500).exact, "1,500")
    assert.equal(getCompactNumberDisplay(1500).showTooltip, true)
  })

  it("compacts millions", () => {
    assert.equal(formatCompactNumber(1_200_000), "1.2M")
    assert.equal(getCompactNumberDisplay(1_200_000).exact, "1,200,000")
  })

  it("handles zero and negatives", () => {
    assert.equal(formatCompactNumber(0), "0")
    assert.equal(getCompactNumberDisplay(0).showTooltip, false)
    assert.equal(formatCompactNumber(-2500), "-2.5K")
    assert.equal(getCompactNumberDisplay(-2500).showTooltip, true)
  })
})
