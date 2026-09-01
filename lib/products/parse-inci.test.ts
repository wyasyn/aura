import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  parseInciList,
  splitInciTokens,
  stripMarketingTail,
} from "./parse-inci"

describe("splitInciTokens", () => {
  it("splits comma-separated INCI outside parentheses", () => {
    const items = splitInciTokens(
      "Aqua, Glycerin, Tocopherol (Vitamin E), Parfum",
    )

    assert.deepEqual(items, [
      "Aqua",
      "Glycerin",
      "Tocopherol (Vitamin E)",
      "Parfum",
    ])
  })

  it("handles botanical extract parentheses", () => {
    const items = splitInciTokens(
      "Melaleuca Alternifolia (Tea Tree) Leaf Oil, Lavandula Angustifolia Oil",
    )

    assert.deepEqual(items, [
      "Melaleuca Alternifolia (Tea Tree) Leaf Oil",
      "Lavandula Angustifolia Oil",
    ])
  })
})

describe("stripMarketingTail", () => {
  it("removes hand-sanitizer feature marketing from seed data", () => {
    const raw =
      "(v/v) Purpose Benzalkonium Chloride 0.15%, Copper, Water Features: Alcohol-free, non-drying Kills 99.99% of harmful germs"

    const cleaned = stripMarketingTail(raw)

    assert.equal(cleaned.includes("Features:"), false)
    assert.equal(cleaned.includes("Kills"), false)
    assert.match(cleaned, /Benzalkonium Chloride/i)
  })
})

describe("parseInciList", () => {
  it("parses a standard INCI declaration", () => {
    const result = parseInciList(
      "Aqua, Glycerin, Niacinamide, Tocopherol (Vitamin E)",
    )

    assert.equal(result.isLikelyInciList, true)
    assert.equal(result.items.length, 4)
  })

  it("parses seed hand-sanitizer highlight after stripping marketing", () => {
    const result = parseInciList(
      "(v/v) Purpose Benzalkonium Chloride 0.15%, Copper, Water, Propylene Glycol, Aloe Vera Leaf Juice, Neem & Turmeric Hydrosol, Hydroxyethylcellulose, Melaleuca Alternifolia (Tea Tree) EO, Lavender, Eucalyptus, Wild Orange, Rosemary, Camphor, Glycrin & Euclutus Features: Alcohol-free, non-drying to the skin Kills 99.99% of harmful germs and bacteria",
    )

    assert.equal(result.isLikelyInciList, true)
    assert.ok(result.items.length >= 8)
    assert.ok(
      result.items.some((item) => /Benzalkonium Chloride/i.test(item)),
    )
    assert.ok(
      result.items.some((item) =>
        /Melaleuca Alternifolia \(Tea Tree\) EO/i.test(item),
      ),
    )
  })

  it("rejects lip-mask marketing highlight without INCI structure", () => {
    const result = parseInciList(
      "Clinically proven to boost lip volume by up to 40% Shea Butter – Nourishes, soothes, and locks in moisture Hyaluronic Acid – Delivers intense hydration for soft, pillowy lips",
    )

    assert.equal(result.isLikelyInciList, false)
  })

  it("rejects sandal scrub key-ingredient marketing", () => {
    const result = parseInciList(
      "Sandal: Extraction Oil and water from the Santalum album tree",
    )

    assert.equal(result.isLikelyInciList, false)
  })

  it("returns empty for not specified", () => {
    const result = parseInciList("Not specified on product page.")

    assert.equal(result.isLikelyInciList, false)
    assert.deepEqual(result.items, [])
  })

  it("returns empty for null and blank input", () => {
    assert.deepEqual(parseInciList(null), {
      raw: "",
      items: [],
      isLikelyInciList: false,
    })
    assert.deepEqual(parseInciList("   "), {
      raw: "",
      items: [],
      isLikelyInciList: false,
    })
  })

  it("accepts a single valid INCI token", () => {
    const result = parseInciList("Hyaluronic Acid")

    assert.equal(result.isLikelyInciList, true)
    assert.deepEqual(result.items, ["Hyaluronic Acid"])
  })
})
