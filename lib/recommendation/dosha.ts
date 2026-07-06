import { clamp, normalize } from './scoring';
import type { RecommendationInput, RecommendationSignal } from './types';

export interface DoshaRecommendation {
  /** The dosha type being evaluated. */
  dosha: 'vata' | 'pitta' | 'kapha';
  /** A short label for the guidance theme. */
  label: string;
  /** A practical skincare recommendation. */
  recommendation: string;
  /** Optional caution to avoid certain ingredients or actions. */
  caution?: string;
}

export interface DoshaInput {
  /** The primary dosha type to evaluate. */
  dosha: 'vata' | 'pitta' | 'kapha';
}

/**
 * Returns skincare recommendations for a given dosha type.
 */
export function getDoshaRecommendations(input: DoshaInput): DoshaRecommendation[] {
  switch (input.dosha) {
    case 'pitta':
      return [
        {
          dosha: 'pitta',
          label: 'Cool and soothing',
          recommendation: 'Recommend Aloe Vera and Centella to calm visible heat and redness.',
          caution: 'Avoid strong acids and harsh exfoliation.',
        },
      ];

    case 'vata':
      return [
        {
          dosha: 'vata',
          label: 'Nourishing and grounding',
          recommendation: 'Recommend rich creams, ceramides, and emollients to support comfort and barrier repair.',
          caution: 'Avoid over-cleansing and overly drying formulas.',
        },
      ];

    case 'kapha':
      return [
        {
          dosha: 'kapha',
          label: 'Light and clarifying',
          recommendation: 'Recommend gel textures, lightweight hydration, and clarifying actives to support balance.',
          caution: 'Avoid overly occlusive or heavy products.',
        },
      ];

    default:
      return [];
  }
}

export function buildDoshaSignal(input: RecommendationInput): RecommendationSignal {
  const balanceScore = clamp(1 - input.lifestyle.stressLevel / 10, 0, 1);
  const recoveryScore = normalize(input.lifestyle.sleepHours, 5, 9);
  const score = clamp((balanceScore * 0.6 + recoveryScore * 0.4), 0, 1);

  return {
    module: 'dosha',
    score,
    reasons: [
      'Lifestyle and recovery signals are used to shape a grounding recommendation.',
      'The recommendation favors restorative support over aggressive correction.',
    ],
  };
}
