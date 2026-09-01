import { resolveIngredientList } from "@/lib/products/parse-inci"

const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  fragrance: ["fragrance", "parfum", "perfume", "aroma"],
  parfum: ["fragrance", "parfum", "perfume", "aroma"],
  perfume: ["fragrance", "parfum", "perfume", "aroma"],
  lanolin: ["lanolin"],
  nut: ["prunus", "almond", "juglans", "arachis", "peanut"],
  almond: ["prunus amygdalus", "almond", "sweet almond"],
  peanut: ["arachis", "peanut"],
  soy: ["soy", "soja", "glycine soja"],
  gluten: ["triticum", "wheat", "hordeum", "barley", "avena", "oat"],
  salicylate: ["salicylic", "salicylate"],
  sulfite: ["sulfite", "sulphite"],
  tea: ["camellia sinensis", "melaleuca alternifolia", "tea tree"],
  lavender: ["lavandula", "lavender"],
  eucalyptus: ["eucalyptus"],
  rosemary: ["rosmarinus", "rosemary"],
  citrus: ["citrus", "limonene", "linalool", "citral", "orange", "lemon"],
  coconut: ["cocos nucifera", "coconut"],
  shea: ["butyrospermum parkii", "shea"],
}

export function parseAllergyTokens(allergies: string | null | undefined): string[] {
  if (!allergies?.trim()) {
    return []
  }

  return [
    ...new Set(
      allergies
        .split(/[,;]+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

function expandAllergyVariants(allergy: string): string[] {
  const variants = new Set<string>([allergy])

  for (const [key, synonyms] of Object.entries(ALLERGEN_SYNONYMS)) {
    if (allergy.includes(key) || key.includes(allergy)) {
      for (const synonym of synonyms) {
        variants.add(synonym)
      }
    }
  }

  return [...variants]
}

export function ingredientConflictsWithAllergies(
  ingredientList: string[],
  allergies: string | null | undefined,
): boolean {
  const allergyTokens = parseAllergyTokens(allergies)
  if (allergyTokens.length === 0 || ingredientList.length === 0) {
    return false
  }

  const ingredientsLower = ingredientList.map((item) => item.toLowerCase())

  for (const allergy of allergyTokens) {
    const variants = expandAllergyVariants(allergy)
    for (const variant of variants) {
      if (ingredientsLower.some((ingredient) => ingredient.includes(variant))) {
        return true
      }
    }
  }

  return false
}

export function productIngredientListConflictsWithAllergies(
  product: {
    ingredientList?: string[] | null
    ingredients?: string | null
  },
  allergies: string | null | undefined,
): boolean {
  const ingredientList = resolveIngredientList(
    product.ingredientList,
    product.ingredients,
  )

  return ingredientConflictsWithAllergies(ingredientList, allergies)
}
