import type { SkinAssessment } from "@/lib/scan/types"
import type { UsageInput } from "@/lib/scans/cost"

export type CatalogProductContext = {
  slug: string
  name: string
  description: string
  /** WooCommerce merchandising taxonomy. Not a classification. */
  category: string
  /** Structured product metadata: organic, ayurvedic, clinical and so on. */
  classifications: string[]
  /** What the product is claimed to do, in shared benefit vocabulary. */
  cosmeticBenefits: string[]
  /** Where it sits in a routine — cleanser, serum, sunscreen. */
  routineCategory: string | null
  /**
   * 0–100, how much of this product's recommendation-relevant data is filled
   * in. Carried so a future engine can tell "does not suit dry skin" apart from
   * "nobody recorded which skin types it suits".
   */
  completenessScore: number
  /** Which catalogue this came from — the platform's, or the current clinic's. */
  source: "aurora" | "clinic"
  ingredients: string | null
  ingredientList: string[]
  targetConcerns: string[]
  suitableSkinTypes: string[]
  climateTags: string[]
  purchaseUrl: string
}

export type ScanHistoryContextItem = {
  scanId: string
  createdAt: string
  overallBand: string
  summary: string
  dimensions: { id: string; band: string }[]
  naturalRecommendations: { title: string; description: string }[]
  recommendations: { id: string; name: string; reason: string }[]
}

export type UserScanContext = {
  profile: {
    ageBand: string | null
    skinType: string | null
    fitzpatrickBand: string | null
    skinDosha: string | null
    primaryConcerns: string[]
    skinGoals: string[]
    allergies: string | null
    currentRoutine: unknown
    lifestyleFactors: unknown
  } | null
  location: {
    city: string | null
    region: string | null
    country: string | null
    uvIndexBand: string | null
    humidityBand: string | null
    temperatureBand: string | null
    climateZone: string | null
    seasonBand: string | null
  } | null
}

export type AnalyzeSkinInput = {
  userId: string
  image: Buffer
  mimeType: string
  model: {
    provider: UsageInput["provider"]
    modelId: string
    displayName: string | null
    thinkingLevel?: string | null
  }
  catalog: CatalogProductContext[]
  userContext: UserScanContext
  activeClimateTags?: string[]
  liveTranscript?: string
  scanHistory?: ScanHistoryContextItem[]
  recommendedActives?: string
}

export type AnalyzeSkinResult = {
  assessment: SkinAssessment
  usage: UsageInput
  latencyMs: number
}
