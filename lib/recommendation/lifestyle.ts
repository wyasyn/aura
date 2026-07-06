import { clamp, normalize } from './scoring';
import type { RecommendationInput, RecommendationSignal } from './types';

export interface LifestyleRecommendation {
  /** The lifestyle factor being evaluated. */
  factor: 'sleep' | 'stress' | 'water' | 'exercise' | 'smoking' | 'alcohol' | 'diet';
  /** A short label for the detected lifestyle pattern. */
  label: string;
  /** A practical skincare recommendation. */
  recommendation: string;
  /** Severity or urgency of the recommendation. */
  severity: 'low' | 'moderate' | 'high';
}

export interface LifestyleInput {
  /** Average nightly sleep in hours. */
  sleep: number;
  /** Stress level from 0 to 100. */
  stress: number;
  /** Daily water intake in liters. */
  water: number;
  /** Weekly exercise frequency in days. */
  exercise: number;
  /** Smoking frequency as a boolean or intensity score. */
  smoking: number;
  /** Alcohol frequency as a boolean or intensity score. */
  alcohol: number;
  /** Dietary pattern label or quality score. */
  diet: string;
}

/**
 * Returns structured lifestyle skincare recommendations from daily habit inputs.
 */
export function getLifestyleRecommendations(input: LifestyleInput): LifestyleRecommendation[] {
  const recommendations: LifestyleRecommendation[] = [];

  if (input.sleep < 6) {
    recommendations.push({
      factor: 'sleep',
      label: 'Poor sleep',
      recommendation: 'Recommend an eye cream and a soothing overnight moisturizer to support recovery.',
      severity: 'high',
    });
  }

  if (input.stress > 70) {
    recommendations.push({
      factor: 'stress',
      label: 'High stress',
      recommendation: 'Recommend barrier-repair products and calming ingredients such as Centella.',
      severity: 'high',
    });
  }

  if (input.water < 2) {
    recommendations.push({
      factor: 'water',
      label: 'Low hydration',
      recommendation: 'Increase hydration support with a humectant-rich moisturizer.',
      severity: 'moderate',
    });
  }

  if (input.exercise < 2) {
    recommendations.push({
      factor: 'exercise',
      label: 'Low movement',
      recommendation: 'Recommend gentle circulation-supportive skincare and consistent daily care.',
      severity: 'low',
    });
  }

  if (input.smoking > 0) {
    recommendations.push({
      factor: 'smoking',
      label: 'Smoking exposure',
      recommendation: 'Recommend antioxidant support and barrier protection to counter oxidative stress.',
      severity: 'high',
    });
  }

  if (input.alcohol > 0) {
    recommendations.push({
      factor: 'alcohol',
      label: 'Alcohol intake',
      recommendation: 'Recommend soothing hydration and a gentle cleanser to support the skin barrier.',
      severity: 'moderate',
    });
  }

  if (input.diet.toLowerCase().includes('poor') || input.diet.toLowerCase().includes('fast')) {
    recommendations.push({
      factor: 'diet',
      label: 'Diet quality',
      recommendation: 'Recommend nutrient-supportive skincare and a balanced diet for better skin resilience.',
      severity: 'moderate',
    });
  }

  return recommendations;
}

export function buildLifestyleSignal(input: RecommendationInput): RecommendationSignal {
  const hydrationScore = normalize(input.lifestyle.hydrationHabits, 0, 10);
  const sunscreenScore = normalize(input.lifestyle.sunscreenUse, 0, 10);
  const screenTimeScore = clamp(1 - input.lifestyle.screenTimeHours / 12, 0, 1);

  const score = clamp((hydrationScore * 0.35 + sunscreenScore * 0.35 + screenTimeScore * 0.3), 0, 1);

  return {
    module: 'lifestyle',
    score,
    reasons: [
      'Daily habits influence how much protection and support is needed.',
      'Consistency cues are used to recommend practical, sustainable products.',
    ],
  };
}
