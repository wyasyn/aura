import type {
  ClimateBand,
  DataConfidence,
  IngredientRole,
  ProductAvailability,
  ProductClassification,
  RoutineCategory,
} from "@/generated/prisma/client"
import type { ProductClimateTag } from "@/lib/products/constants"
import type { WeightedConcern } from "@/lib/recommendation/concerns"

/**
 * A citable ingredient inside a candidate product.
 *
 * Carries the ingredient's own concern and dosha data, so the engine can say
 * "the neem addresses your congestion" from the join rather than from a model's
 * recollection of what neem does.
 */
export type CandidateIngredient = {
  inciName: string
  displayName: string | null
  role: IngredientRole
  isKeyActive: boolean
  position: number | null
  targetConcerns: string[]
  benefits: string[]
  doshaAffinities: string[]
  /** Cosmetic layering guidance, never a medical contraindication. */
  avoidWith: string[]
}

/** One product as the engine sees it. Everything needed to score, nothing more. */
export type CandidateProduct = {
  slug: string
  name: string
  description: string
  category: string
  brand: string | null
  primaryClassification: ProductClassification | null
  secondaryClassifications: ProductClassification[]
  classificationConfidence: DataConfidence
  targetConcerns: string[]
  suitableSkinTypes: string[]
  cosmeticBenefits: string[]
  climateTags: string[]
  suitableHumidity: ClimateBand[]
  suitableTemperature: ClimateBand[]
  suitableUv: ClimateBand[]
  routineCategory: RoutineCategory | null
  routineStep: number | null
  amSuitable: boolean
  pmSuitable: boolean
  availability: ProductAvailability
  isActive: boolean
  isRecommendable: boolean
  completenessScore: number
  /** Free-text INCI, the fallback the allergy check reads. */
  ingredients: string | null
  ingredientList: string[]
  ingredientLinks: CandidateIngredient[]
  imageUrl: string | null
  storeUrl: string | null
  /** Which catalogue it came from. Never the organization id itself. */
  source: "aurora" | "clinic"
}

/**
 * Everything the engine knows about the person, resolved once.
 *
 * Built server-side from the scan, the profile and the live climate. It holds
 * no identifiers: the engine scores a situation, not a user, so nothing here
 * can leak into a stored recommendation or a prompt by accident.
 */
export type RecommendationContext = {
  concerns: WeightedConcern[]
  /** Summed strength per concern, which is what scoring actually reads. */
  concernStrengths: Map<string, number>
  skinType: string | null
  dosha: string | null
  goals: string[]
  climateTags: ProductClimateTag[]
  humidityBand: ClimateBand | null
  temperatureBand: ClimateBand | null
  uvBand: ClimateBand | null
  /** Raw stated allergies. Matched against ingredients by the safety layer. */
  allergies: string | null
}

/** Why a product was excluded. Recorded, so an empty result is explainable. */
export type ExclusionReason =
  | "inactive"
  | "not_recommendable"
  | "unavailable"
  | "allergy_conflict"
  | "no_concern_match"

export type ExcludedCandidate = {
  slug: string
  reason: ExclusionReason
  /** The stated allergy that matched, for `allergy_conflict` only. */
  detail?: string
}

/** One axis of a score, kept so a ranking can be explained rather than asserted. */
export type ScoreComponent = {
  axis: string
  /** Raw 0–1 fit on this axis before the weight is applied. */
  fit: number
  weight: number
  points: number
  /** What matched, in the vocabulary a person reads. */
  matched: string[]
}

export type ScoredCandidate = {
  product: CandidateProduct
  /** Weighted total after the confidence multipliers. */
  score: number
  /** Before multipliers, so the effect of data quality is visible. */
  rawScore: number
  components: ScoreComponent[]
  /** Concerns this product addresses, strongest first. */
  citableConcerns: string[]
  /** Key actives whose own concerns match, for the explanation layer. */
  citableIngredients: string[]
  multiplier: number
}
