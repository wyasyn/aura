import type { Product, ScorerContext } from '../types';

export function scoreConcern(product: Product, ctx: ScorerContext): number {
  const keyMap: Record<string, string> = {
    pigmentation: 'pigmentation', redness: 'redness', wrinkles: 'wrinkles',
    pores: 'pores', hydration: 'hydration', aging: 'aging',
    texture: 'texture', sensitivity: 'sensitivity',
  };

  let totalNeed = 0;
  let maxPossible = 0;
  const scores = ctx.skinScores as unknown as Record<string, number>;

  for (const concern of product.targetConcerns) {
    const key = keyMap[concern];
    if (!key) continue;
    const rawScore = scores[key];
    if (rawScore === undefined) continue;
    const need = key === 'hydration' ? 100 - rawScore : rawScore;
    totalNeed += need;
    maxPossible += 100;
  }

  if (maxPossible === 0) return 50;
  return (totalNeed / maxPossible) * 100;
}
