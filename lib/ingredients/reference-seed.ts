export type IngredientReferenceSeed = {
  inciName: string
  displayName?: string
  synonyms?: string[]
  targetConcerns?: string[]
  suitableSkinTypes?: string[]
  climateTags?: string[]
  doshaAffinities?: string[]
  notes?: string
}

export const INGREDIENT_REFERENCE_SEED: IngredientReferenceSeed[] = [
  {
    inciName: "Hyaluronic Acid",
    synonyms: ["Sodium Hyaluronate"],
    targetConcerns: ["dryness", "hydration", "aging"],
    suitableSkinTypes: ["dry", "combination", "normal"],
    climateTags: ["dry", "cold"],
    doshaAffinities: ["vata"],
  },
  {
    inciName: "Niacinamide",
    synonyms: ["Nicotinamide"],
    targetConcerns: ["hyperpigmentation", "texture", "oiliness"],
    suitableSkinTypes: ["oily", "combination", "normal"],
    climateTags: ["humid", "polluted"],
    doshaAffinities: ["pitta", "kapha"],
  },
  {
    inciName: "Glycerin",
    synonyms: ["Glycerol"],
    targetConcerns: ["dryness", "barrier_support"],
    suitableSkinTypes: ["dry", "sensitive", "normal"],
    climateTags: ["dry", "cold"],
    doshaAffinities: ["vata"],
  },
  {
    inciName: "Aloe Barbadensis Leaf Juice",
    synonyms: ["Aloe Vera Leaf Juice", "Aloe Vera"],
    targetConcerns: ["redness", "sensitivity", "dryness"],
    suitableSkinTypes: ["sensitive", "dry", "normal"],
    climateTags: ["high_uv", "humid"],
    doshaAffinities: ["pitta"],
  },
  {
    inciName: "Butyrospermum Parkii Butter",
    synonyms: ["Shea Butter"],
    targetConcerns: ["dryness", "barrier_support"],
    suitableSkinTypes: ["dry", "sensitive"],
    climateTags: ["cold", "dry"],
    doshaAffinities: ["vata"],
  },
  {
    inciName: "Melaleuca Alternifolia Leaf Oil",
    synonyms: ["Tea Tree Oil", "Melaleuca Alternifolia (Tea Tree) EO"],
    targetConcerns: ["acne", "oiliness"],
    suitableSkinTypes: ["oily", "combination"],
    climateTags: ["humid"],
    doshaAffinities: ["kapha", "pitta"],
  },
  {
    inciName: "Tocopherol",
    synonyms: ["Vitamin E", "Tocopherol (Vitamin E)"],
    targetConcerns: ["aging", "barrier_support"],
    suitableSkinTypes: ["dry", "normal", "sensitive"],
    climateTags: ["high_uv", "polluted"],
    doshaAffinities: ["vata"],
  },
  {
    inciName: "Ascorbic Acid",
    synonyms: ["Vitamin C", "L-Ascorbic Acid"],
    targetConcerns: ["hyperpigmentation", "aging"],
    suitableSkinTypes: ["normal", "combination"],
    climateTags: ["high_uv", "polluted"],
    doshaAffinities: ["pitta"],
  },
  {
    inciName: "Centella Asiatica Extract",
    synonyms: ["Gotu Kola", "Cica"],
    targetConcerns: ["redness", "sensitivity", "barrier_support"],
    suitableSkinTypes: ["sensitive", "dry", "normal"],
    climateTags: ["polluted", "humid"],
    doshaAffinities: ["pitta", "vata"],
  },
  {
    inciName: "Squalane",
    targetConcerns: ["dryness", "barrier_support"],
    suitableSkinTypes: ["dry", "sensitive", "normal"],
    climateTags: ["dry", "cold"],
    doshaAffinities: ["vata"],
  },
  {
    inciName: "Salicylic Acid",
    targetConcerns: ["acne", "texture", "oiliness"],
    suitableSkinTypes: ["oily", "combination"],
    climateTags: ["humid"],
    doshaAffinities: ["kapha"],
  },
  {
    inciName: "Panthenol",
    synonyms: ["Provitamin B5", "D-Panthenol"],
    targetConcerns: ["dryness", "barrier_support", "redness"],
    suitableSkinTypes: ["sensitive", "dry", "normal"],
    climateTags: ["dry", "cold"],
    doshaAffinities: ["vata", "pitta"],
  },
  {
    inciName: "Ceramide NP",
    synonyms: ["Ceramides", "Ceramide AP", "Ceramide EOP"],
    targetConcerns: ["barrier_support", "dryness"],
    suitableSkinTypes: ["dry", "sensitive"],
    climateTags: ["cold", "dry"],
    doshaAffinities: ["vata"],
  },
  {
    inciName: "Zinc Oxide",
    targetConcerns: ["redness", "sensitivity"],
    suitableSkinTypes: ["sensitive", "normal"],
    climateTags: ["high_uv"],
    doshaAffinities: ["pitta"],
  },
  {
    inciName: "Parfum",
    synonyms: ["Fragrance", "Perfume", "Aroma"],
    notes: "Common allergen — use for allergy cross-check normalization only.",
  },
]
