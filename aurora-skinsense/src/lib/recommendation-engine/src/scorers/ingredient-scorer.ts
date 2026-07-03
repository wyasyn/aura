import type { Product, ScorerContext, Ingredient } from '../types';

export function scoreIngredients(product: Product, ctx: ScorerContext): number {
  const ings = product.ingredientIds
    .map(id => ctx.ingredients.get(id))
    .filter((i): i is Ingredient => i !== undefined);

  if (ings.length === 0) return 30;

  let total = 0;
  let penalties = 0;
  const scores = ctx.skinScores as unknown as Record<string, number>;
  const sensitivity = ctx.skinScores.sensitivity;

  const elevated = Object.entries(scores)
    .filter(([k, v]) => k !== 'overall' && v !== undefined && (k === 'hydration' ? v < 60 : v > 40))
    .map(([k]) => k);

  for (const ing of ings) {
    let s = (ing.safetyScore / 10) * 100;

    if (ing.comedogenicRating >= 4) { s *= 0.6; penalties++; }
    else if (ing.comedogenicRating >= 3) { s *= 0.8; penalties++; }

    if (ing.safetyScore <= 5 && sensitivity > 60) { s *= 0.3; penalties++; }
    else if (ing.safetyScore <= 6 && sensitivity > 70) { s *= 0.5; penalties++; }
    else if (ing.safetyScore <= 7 && sensitivity > 80) { s *= 0.7; penalties++; }

    if (ing.targetConcerns.some(c => elevated.includes(c))) s *= 1.1;
    if (ing.doshaAffinity.includes(ctx.dosha.primary)) s *= 1.05;

    total += Math.min(100, s);
  }

  return Math.max(5, (total / ings.length) - Math.min(20, penalties * 5));
}
