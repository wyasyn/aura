import type { Product, ScorerContext, DoshaType } from '../types';

const OPPOSITES: Record<DoshaType, DoshaType> = {
  vata: 'kapha', kapha: 'vata', pitta: 'pitta', tridoshic: 'tridoshic',
};

export function scoreDosha(product: Product, ctx: ScorerContext): number {
  const primary = ctx.dosha.primary;
  const secondary = ctx.dosha.secondary;

  if (primary === 'tridoshic') return 88;
  if (product.doshaCompatibility.includes(primary)) return 95;
  if (product.doshaCompatibility.includes(secondary)) return 72;

  const hasAffinity = product.ingredientIds.some(id => {
    const ing = ctx.ingredients.get(id);
    return ing?.doshaAffinity.includes(primary);
  });
  if (hasAffinity) return 55;

  if (product.doshaCompatibility.includes(OPPOSITES[primary]) &&
      !product.doshaCompatibility.includes(primary)) {
    return 20;
  }

  return 40;
}
