import type { IngredientRole } from "@/generated/prisma/client"

/**
 * Builds the ProductIngredient join from the ingredient text a product already
 * carries.
 *
 * Product.ingredientList is a bag of strings. It cannot say whether an INCI
 * name is the headline active or the preservative at the end of the list, and a
 * recommendation that cites an ingredient as its reason needs to know the
 * difference. That is the whole reason this join exists.
 */

/** An ingredient row reduced to what matching needs. */
export type LinkableIngredient = {
  id: string
  inciName: string
  displayName: string | null
  synonyms: string[]
  functions: IngredientRole[]
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * The names one ingredient row answers to, longest first.
 *
 * Longest first because "Aloe Barbadensis Leaf Juice" and "Aloe Vera" can both
 * be listed for the same row, and matching the longer name first stops a short
 * synonym from claiming a token that a more specific name describes better.
 */
function aliasesOf(ingredient: LinkableIngredient): string[] {
  return [ingredient.inciName, ingredient.displayName ?? "", ...ingredient.synonyms]
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
}

/**
 * Whether an INCI token names this ingredient.
 *
 * Deliberately stricter than substring-either-way. `resolveIngredientReference`
 * accepts `candidate.includes(needle)`, which is right for a lookup where a
 * near miss is better than nothing, but wrong for writing rows: "oil" would
 * match "Tea Tree Oil" and link every product containing any oil to tea tree.
 * Here the token must contain the full alias, on a word boundary.
 */
export function tokenNamesIngredient(token: string, alias: string): boolean {
  const haystack = normalize(token)
  const needle = normalize(alias)
  if (!haystack || !needle) return false
  if (haystack === needle) return true

  const at = haystack.indexOf(needle)
  if (at < 0) return false

  const before = at === 0 ? " " : haystack[at - 1]
  const afterIndex = at + needle.length
  const after = afterIndex >= haystack.length ? " " : haystack[afterIndex]
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)
}

/** The role to record for a link, taken from what the ingredient does. */
export function roleFor(ingredient: LinkableIngredient): IngredientRole {
  return ingredient.functions[0] ?? "unspecified"
}

/**
 * Whether a linked ingredient may be cited as the reason for a recommendation.
 *
 * Two conditions, both required. It has to actually do something — an
 * `active`, `exfoliant` or `antioxidant`, not a solvent — and it has to appear
 * high enough on the label to be present in a meaningful amount. INCI order is
 * by descending concentration, so position is the only quantity signal a label
 * gives. Position 6 is a judgement call, not a measurement, which is why it is
 * a named constant rather than a magic number buried in a condition.
 */
export const KEY_ACTIVE_MAX_POSITION = 6

const CITABLE_ROLES = new Set<IngredientRole>([
  "active",
  "exfoliant",
  "antioxidant",
])

export function isKeyActive(
  ingredient: LinkableIngredient,
  position: number | null,
): boolean {
  if (!ingredient.functions.some((fn) => CITABLE_ROLES.has(fn))) return false
  if (position === null) return true
  return position <= KEY_ACTIVE_MAX_POSITION
}

export type ResolvedLink = {
  ingredientId: string
  position: number | null
  role: IngredientRole
  isKeyActive: boolean
}

/**
 * Matches a product's ingredient tokens against the reference table.
 *
 * Pure, so the matching rules can be tested without a database. The first
 * position an ingredient is found at wins: a label that lists water twice is
 * telling us about the first occurrence.
 */
export function resolveLinks(
  tokens: string[],
  ingredients: LinkableIngredient[],
): ResolvedLink[] {
  const byId = new Map<string, ResolvedLink>()

  tokens.forEach((token, index) => {
    const position = index + 1
    for (const ingredient of ingredients) {
      if (byId.has(ingredient.id)) continue
      if (!aliasesOf(ingredient).some((alias) => tokenNamesIngredient(token, alias))) {
        continue
      }
      byId.set(ingredient.id, {
        ingredientId: ingredient.id,
        position,
        role: roleFor(ingredient),
        isKeyActive: isKeyActive(ingredient, position),
      })
    }
  })

  return [...byId.values()]
}
