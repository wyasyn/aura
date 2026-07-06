import type { RecommendationRules, SkinAnalysis } from './types';

export interface RecommendationRule {
  /** A machine-readable identifier for the rule. */
  id: string;
  /** A short description of the condition being matched. */
  description: string;
  /** The concern or signal that triggers the rule. */
  condition: string;
  /** The ingredient names to recommend when the rule matches. */
  recommend: string[];
  /** Ingredients that should be avoided or limited for this rule. */
  avoid?: string[];
}

export interface RecommendationRuleSet {
  /** The rules used to derive ingredient recommendations. */
  rules: RecommendationRule[];
}

export interface RuleExecutionResult {
  /** The matched rules that were executed for this analysis. */
  rules: RecommendationRule[];
  /** Ingredients recommended by the executed rules. */
  recommendedIngredients: string[];
  /** Ingredients to avoid or limit per the executed rules. */
  avoidIngredients: string[];
}

/**
 * Rule catalog stored separately from the engine.
 */
export const recommendationRules: RecommendationRuleSet = {
  rules: [
    {
      id: 'acne-oiliness-high',
      description: 'High acne and oiliness indicate a clarifying routine.',
      condition: 'acne-high-and-oiliness-high',
      recommend: ['Niacinamide', 'Salicylic Acid', 'Zinc PCA'],
      avoid: ['Heavy occlusives'],
    },
    {
      id: 'dryness-severe',
      description: 'Severe dryness needs barrier support and hydration.',
      condition: 'dryness-severe',
      recommend: ['Ceramides', 'Hyaluronic Acid', 'Squalane'],
      avoid: ['Strong acids'],
    },
    {
      id: 'sensitivity-redness-high',
      description: 'High sensitivity and redness need calming support.',
      condition: 'sensitivity-high-and-redness-high',
      recommend: ['Aloe Vera', 'Centella', 'Panthenol'],
      avoid: ['Fragrance', 'Harsh exfoliants'],
    },
    {
      id: 'pigmentation-high',
      description: 'High pigmentation benefits from brightening support.',
      condition: 'pigmentation-high',
      recommend: ['Vitamin C', 'Niacinamide', 'Ferulic Acid'],
      avoid: ['Over-exfoliation'],
    },
  ],
};

/**
 * Returns the matching rules for a given condition string.
 */
export function getMatchingRules(condition: string): RecommendationRule[] {
  return recommendationRules.rules.filter((rule) => rule.condition === condition);
}

/**
 * Applies the rule set to a simple condition map and returns the resulting recommendations.
 */
export function applyRecommendationRules(conditionMap: Record<string, string>): RecommendationRule[] {
  const matches: RecommendationRule[] = [];

  if (conditionMap.acne === 'high' || conditionMap.acne === 'severe') {
    if (conditionMap.oiliness === 'high' || conditionMap.oiliness === 'severe') {
      matches.push(...getMatchingRules('acne-high-and-oiliness-high'));
    }
  }

  if (conditionMap.dryness === 'severe') {
    matches.push(...getMatchingRules('dryness-severe'));
  }

  if ((conditionMap.sensitivity === 'high' || conditionMap.sensitivity === 'severe') && (conditionMap.redness === 'high' || conditionMap.redness === 'severe')) {
    matches.push(...getMatchingRules('sensitivity-high-and-redness-high'));
  }

  if (conditionMap.pigmentation === 'high' || conditionMap.pigmentation === 'severe') {
    matches.push(...getMatchingRules('pigmentation-high'));
  }

  return matches;
}

function toConditionLevel(value: number): 'low' | 'moderate' | 'high' | 'severe' {
  if (value >= 75) {
    return 'severe';
  }

  if (value >= 50) {
    return 'high';
  }

  if (value >= 25) {
    return 'moderate';
  }

  return 'low';
}

export function buildConditionMapFromSkinAnalysis(analysis: SkinAnalysis): Record<string, string> {
  return {
    acne: toConditionLevel(analysis.oiliness + analysis.redness / 2),
    oiliness: toConditionLevel(analysis.oiliness),
    dryness: toConditionLevel(analysis.dryness),
    sensitivity: toConditionLevel(analysis.sensitivity),
    redness: toConditionLevel(analysis.redness),
    pigmentation: toConditionLevel(analysis.pigmentation),
  };
}

export function executeRecommendationRules(analysis: SkinAnalysis): RuleExecutionResult {
  const conditionMap = buildConditionMapFromSkinAnalysis(analysis);
  const rules = applyRecommendationRules(conditionMap);
  const recommendedIngredients = Array.from(new Set(rules.flatMap((rule) => rule.recommend)));
  const avoidIngredients = Array.from(new Set(rules.flatMap((rule) => rule.avoid ?? [])));

  return {
    rules,
    recommendedIngredients,
    avoidIngredients,
  };
}

export function createDefaultRules(): RecommendationRules {
  return {
    weights: {
      climate: 0.25,
      ingredients: 0.25,
      dosha: 0.2,
      lifestyle: 0.15,
      productFit: 0.15,
    },
    thresholds: {
      strongMatch: 0.75,
      moderateMatch: 0.55,
    },
  };
}
