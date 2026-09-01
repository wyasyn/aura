import assert from "node:assert/strict"
import { test } from "node:test"

import {
  isKeyActive,
  KEY_ACTIVE_MAX_POSITION,
  resolveLinks,
  roleFor,
  tokenNamesIngredient,
  type LinkableIngredient,
} from "@/lib/ingredients/link-products"

function ingredient(
  over: Partial<LinkableIngredient> & Pick<LinkableIngredient, "id" | "inciName">,
): LinkableIngredient {
  return {
    displayName: null,
    synonyms: [],
    functions: [],
    ...over,
  }
}

const TEA_TREE = ingredient({
  id: "tea-tree",
  inciName: "Melaleuca Alternifolia Leaf Oil",
  synonyms: ["Tea Tree Oil"],
  functions: ["active", "fragrance"],
})

const NIACINAMIDE = ingredient({
  id: "niacinamide",
  inciName: "Niacinamide",
  synonyms: ["Nicotinamide"],
  functions: ["active", "antioxidant"],
})

const GLYCERIN = ingredient({
  id: "glycerin",
  inciName: "Glycerin",
  synonyms: ["Glycerol"],
  functions: ["humectant", "solvent"],
})

test("a token matches an alias on a word boundary", () => {
  assert.equal(tokenNamesIngredient("Niacinamide", "niacinamide"), true)
  assert.equal(tokenNamesIngredient("  NIACINAMIDE  ", "Niacinamide"), true)
  assert.equal(
    tokenNamesIngredient("Melaleuca Alternifolia (Tea Tree Oil)", "Tea Tree Oil"),
    true,
  )
})

test("a short alias does not claim a token that merely contains its letters", () => {
  // The bug this rule exists to stop: "Oil" appearing inside "Sunflower Seed
  // Oil" must not link that token to tea tree oil.
  assert.equal(tokenNamesIngredient("Helianthus Annuus Seed Oil", "Tea Tree Oil"), false)
  assert.equal(tokenNamesIngredient("Niacinamide Palmitate", "Niacinamide"), true)
  assert.equal(tokenNamesIngredient("Polyniacinamide", "Niacinamide"), false)
})

test("resolveLinks records 1-based INCI position", () => {
  const links = resolveLinks(["Aqua", "Glycerin", "Niacinamide"], [GLYCERIN, NIACINAMIDE])

  assert.equal(links.length, 2)
  assert.equal(links.find((l) => l.ingredientId === "glycerin")?.position, 2)
  assert.equal(links.find((l) => l.ingredientId === "niacinamide")?.position, 3)
})

test("the first occurrence wins when a label repeats an ingredient", () => {
  const links = resolveLinks(["Glycerin", "Aqua", "Glycerin"], [GLYCERIN])

  assert.equal(links.length, 1)
  assert.equal(links[0].position, 1)
})

test("role comes from what the ingredient does", () => {
  assert.equal(roleFor(NIACINAMIDE), "active")
  assert.equal(roleFor(GLYCERIN), "humectant")
  assert.equal(roleFor(ingredient({ id: "x", inciName: "Unknown" })), "unspecified")
})

test("only ingredients that do something can be cited as the reason", () => {
  // Glycerin is genuinely useful, but a recommendation whose stated reason is
  // "contains a solvent" is not a reason.
  assert.equal(isKeyActive(GLYCERIN, 1), false)
  assert.equal(isKeyActive(NIACINAMIDE, 1), true)
})

test("an active buried at the end of the label is not a key active", () => {
  assert.equal(isKeyActive(NIACINAMIDE, KEY_ACTIVE_MAX_POSITION), true)
  assert.equal(isKeyActive(NIACINAMIDE, KEY_ACTIVE_MAX_POSITION + 1), false)
})

test("an active with no position is citable", () => {
  // No position means the label gave no ordering, not that the ingredient is
  // last. Withholding the citation there would lose a true statement.
  assert.equal(isKeyActive(TEA_TREE, null), true)
})

test("nothing is linked when no token names a known ingredient", () => {
  assert.deepEqual(resolveLinks(["Aqua", "Parfum"], [NIACINAMIDE]), [])
})
