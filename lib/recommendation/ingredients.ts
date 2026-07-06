import { clamp, normalize } from './scoring';
import type { RecommendationInput, RecommendationSignal } from './types';

export interface IngredientProfile {
  /** Ingredient display name. */
  name: string;
  /** Main skin and cosmetic benefits. */
  benefits: string[];
  /** Skin types that generally suit this ingredient. */
  suitableSkinTypes: string[];
  /** Skin conditions or contexts where this ingredient should be avoided. */
  avoidFor: string[];
  /** Ingredients that typically pair well with this ingredient. */
  compatibleIngredients: string[];
  /** Ingredients that may conflict or be overused together. */
  conflictingIngredients: string[];
  /** Pregnancy safety guidance. */
  pregnancySafety: string;
  /** Short scientific explanation. */
  scientificNotes: string;
}

export interface IngredientCatalogEntry extends IngredientProfile {
  /** Unique identifier for the ingredient entry. */
  id: string;
}

export interface IngredientSearchFilters {
  /** Optional condition or concern to match against benefits. */
  condition?: string;
  /** Optional skin type to match. */
  skinType?: string;
  /** Optional ingredient name fragment to search. */
  query?: string;
}

export const ingredientCatalog: IngredientCatalogEntry[] = [
  {
    id: 'ceramides',
    name: 'Ceramides',
    benefits: ['Barrier support', 'Moisture retention', 'Reduced sensitivity'],
    suitableSkinTypes: ['dry', 'sensitive', 'combination'],
    avoidFor: ['very oily skin if overused'],
    compatibleIngredients: ['hyaluronic acid', 'glycerin', 'niacinamide'],
    conflictingIngredients: ['strong acids'],
    pregnancySafety: 'Generally considered safe.',
    scientificNotes: 'Ceramides replenish the lipid barrier and reduce transepidermal water loss.',
  },
  {
    id: 'niacinamide',
    name: 'Niacinamide',
    benefits: ['Oil control', 'Redness support', 'Barrier strengthening'],
    suitableSkinTypes: ['oily', 'combination', 'sensitive'],
    avoidFor: ['very sensitive skin if used in high concentrations'],
    compatibleIngredients: ['hyaluronic acid', 'ceramides', 'salicylic acid'],
    conflictingIngredients: ['vitamin c'],
    pregnancySafety: 'Generally considered safe.',
    scientificNotes: 'Niacinamide helps regulate sebum and improve barrier function.',
  },
  {
    id: 'hyaluronic-acid',
    name: 'Hyaluronic Acid',
    benefits: ['Hydration', 'Plumper feel', 'Fine line support'],
    suitableSkinTypes: ['dry', 'dehydrated', 'normal'],
    avoidFor: ['none in typical use'],
    compatibleIngredients: ['glycerin', 'ceramides', 'niacinamide'],
    conflictingIngredients: ['strong exfoliating acids'],
    pregnancySafety: 'Generally considered safe.',
    scientificNotes: 'This humectant draws water into the stratum corneum and improves hydration.',
  },
  {
    id: 'salicylic-acid',
    name: 'Salicylic Acid',
    benefits: ['Acne support', 'Pore clarity', 'Exfoliation'],
    suitableSkinTypes: ['oily', 'combination', 'acne-prone'],
    avoidFor: ['very dry skin', 'over-exfoliated skin'],
    compatibleIngredients: ['niacinamide', 'hyaluronic acid'],
    conflictingIngredients: ['benzoyl peroxide'],
    pregnancySafety: 'Use with caution and consult a clinician.',
    scientificNotes: 'Salicylic acid is a beta hydroxy acid that helps dissolve pore-clogging debris.',
  },
];

/**
 * Returns ingredients whose benefits or metadata match the requested condition.
 */
export function findIngredientsByCondition(condition: string): IngredientCatalogEntry[] {
  const normalizedCondition = condition.toLowerCase();

  return ingredientCatalog.filter((ingredient) => {
    const haystack = [
      ingredient.name,
      ...ingredient.benefits,
      ...ingredient.suitableSkinTypes,
      ...ingredient.avoidFor,
      ingredient.pregnancySafety,
      ingredient.scientificNotes,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedCondition);
  });
}

/**
 * Returns ingredients that are compatible with the named ingredient.
 */
export function findCompatibleIngredients(name: string): IngredientCatalogEntry[] {
  const ingredient = ingredientCatalog.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

  if (!ingredient) {
    return [];
  }

  return ingredientCatalog.filter((entry) => ingredient.compatibleIngredients.includes(entry.name.toLowerCase()));
}

/**
 * Returns ingredients that may conflict with the named ingredient.
 */
export function findConflictingIngredients(name: string): IngredientCatalogEntry[] {
  const ingredient = ingredientCatalog.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

  if (!ingredient) {
    return [];
  }

  return ingredientCatalog.filter((entry) => ingredient.conflictingIngredients.includes(entry.name.toLowerCase()));
}

/**
 * Recommends ingredients based on a simple search filter.
 */
export function recommendIngredients(filters: IngredientSearchFilters = {}): IngredientCatalogEntry[] {
  return ingredientCatalog.filter((ingredient) => {
    const matchesCondition = filters.condition
      ? ingredient.benefits.some((benefit) => benefit.toLowerCase().includes(filters.condition!.toLowerCase()))
      : true;

    const matchesSkinType = filters.skinType
      ? ingredient.suitableSkinTypes.some((skinType) => skinType.toLowerCase() === filters.skinType!.toLowerCase())
      : true;

    const matchesQuery = filters.query
      ? ingredient.name.toLowerCase().includes(filters.query.toLowerCase())
      : true;

    return matchesCondition && matchesSkinType && matchesQuery;
  });
}

export function buildIngredientSignal(input: RecommendationInput): RecommendationSignal {
  const hydrationScore = normalize(input.skin.hydration, 0, 10);
  const sensitivityScore = normalize(input.skin.sensitivity, 0, 10);
  const barrierScore = normalize(input.skin.barrier, 0, 10);

  const score = clamp((hydrationScore * 0.4 + sensitivityScore * 0.3 + barrierScore * 0.3), 0, 1);

  return {
    module: 'ingredients',
    score,
    reasons: [
      'Ingredient selection is guided by skin barrier and hydration needs.',
      'A calming and supportive ingredient profile is prioritized.',
    ],
  };
}
