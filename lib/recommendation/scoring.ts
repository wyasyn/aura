export type SeverityLevel = 'none' | 'mild' | 'moderate' | 'high' | 'severe';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) {
    return 0.5;
  }

  return clamp((value - min) / (max - min), 0, 1);
}

export function combineScores(scores: number[], weights: number[]): number {
  if (scores.length !== weights.length) {
    throw new Error('Scores and weights must have the same length.');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const weightedTotal = scores.reduce((sum, score, index) => {
    const normalizedScore = score ?? 0;
    const normalizedWeight = weights[index] ?? 0;
    return sum + normalizedScore * normalizedWeight;
  }, 0);

  return totalWeight === 0 ? 0 : weightedTotal / totalWeight;
}

/**
 * Converts a numeric score into a coarse severity band.
 */
export function scoreSeverity(value: number): SeverityLevel {
  if (value <= 0) {
    return 'none';
  }

  if (value < 25) {
    return 'mild';
  }

  if (value < 50) {
    return 'moderate';
  }

  if (value < 75) {
    return 'high';
  }

  return 'severe';
}

/**
 * Converts a record of AI skin analysis values into severity labels.
 */
export function scoreSkinAnalysis(values: Record<string, number>): Record<string, SeverityLevel> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, scoreSeverity(value)]),
  );
}

/**
 * Returns a compact severity summary for display or reporting.
 */
export function summarizeSeverity(values: Record<string, number>): Array<{ key: string; value: number; severity: SeverityLevel }> {
  return Object.entries(values).map(([key, value]) => ({
    key,
    value,
    severity: scoreSeverity(value),
  }));
}

// Example usage:
// const example = scoreSkinAnalysis({ acne: 81, dryness: 30, oiliness: 72, pigmentation: 54 });
// example.acne -> 'severe'
// example.dryness -> 'moderate'
// example.oiliness -> 'high'
// example.pigmentation -> 'high'
