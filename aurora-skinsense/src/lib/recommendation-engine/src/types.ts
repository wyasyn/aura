// ═══════════════════════════════════════════════════════════
// AURORA RECOMMENDATION ENGINE — Type Definitions
// ═══════════════════════════════════════════════════════════
// CONTRACT: These types define the boundary between this
// module and the rest of the Aurora platform.
// ═══════════════════════════════════════════════════════════

export type DoshaType = 'vata' | 'pitta' | 'kapha' | 'tridoshic';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type ProductCategory = 'serum' | 'moisturizer' | 'treatment' | 'cleanser' | 'mask' | 'sunscreen';

// ─── INPUT: What the engine receives ──────────────────

/** From: Skin Analysis team */
export interface SkinScores {
  pigmentation: number;
  redness: number;
  wrinkles: number;
  pores: number;
  hydration: number;
  aging: number;
  texture: number;
  sensitivity: number;
  overall: number;
}

/** From: Ayurveda / Dosha Quiz team */
export interface DoshaProfile {
  primary: DoshaType;
  secondary: DoshaType;
  scores: { vata: number; pitta: number; kapha: number };
}

/** From: Climate Intelligence team */
export interface ClimateData {
  temperature: number;
  humidity: number;
  uvIndex: number;
  season: Season;
  pollution: 'low' | 'moderate' | 'high';
  location: string;
}

/** Complete input to the engine */
export interface RecommendationInput {
  skinScores: SkinScores;
  dosha: DoshaProfile;
  climate: ClimateData;
  clinicId?: string;
  categoryFilter?: string;
  limit?: number;
}

// ─── DATA: Products & Ingredients (from database) ─────

export interface Ingredient {
  id: string;
  inciName: string;
  commonName: string;
  functions: string[];
  safetyScore: number;
  comedogenicRating: number;
  doshaAffinity: DoshaType[];
  climateSuitability: Season[];
  ayurvedicProperties: string[];
  targetConcerns: string[];
}

export interface Product {
  id: string;
  clinicId: string;
  name: string;
  category: ProductCategory;
  subCategory: string;
  description: string;
  price: number;
  currency: string;
  ingredientIds: string[];
  targetConcerns: string[];
  doshaCompatibility: DoshaType[];
  climateSuitability: Season[];
  skinTypes: string[];
  rating: number;
  reviewCount: number;
  image: string;
  ayurvedicNotes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── OUTPUT: What the engine returns ────────────────

export interface Recommendation {
  product: Product;
  matchScore: number;
  rank: number;
  reasoning: string[];
  signalScores: {
    concern: number;
    dosha: number;
    climate: number;
    ingredient: number;
    rating: number;
  };
}

export interface SkinConcern {
  name: string;
  score: number;
  severity: 'low' | 'moderate' | 'high';
  description: string;
}

export interface DoshaInterpretation {
  primary: DoshaType;
  secondary: DoshaType;
  skinType: string;
  strengths: string[];
  vulnerabilities: string[];
  recommendedApproach: string;
}

export interface ClimateGuidance {
  season: Season;
  humidityGuidance: string;
  uvGuidance: string;
  temperatureGuidance: string;
  productTextureAdvice: string;
}

export interface SkinReport {
  skinScores: SkinScores;
  dosha: DoshaProfile;
  climate: ClimateData;
  primaryConcerns: SkinConcern[];
  doshaInterpretation: DoshaInterpretation;
  climateGuidance: ClimateGuidance;
  recommendations: Recommendation[];
  generatedAt: string;
  disclaimer: string;
}

// ─── INTERNAL: Only used inside this module ─────────

export interface ScorerContext {
  skinScores: SkinScores;
  dosha: DoshaProfile;
  climate: ClimateData;
  ingredients: Map<string, Ingredient>;
}