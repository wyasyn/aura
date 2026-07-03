import type { Product, ScorerContext, Season } from '../types';

const ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function scoreClimate(product: Product, ctx: ScorerContext): number {
  const season = ctx.climate.season;
  const idx = ORDER.indexOf(season);

  if (product.climateSuitability.includes(season)) return 95;

  const adjacent = [ORDER[(idx - 1 + 4) % 4], ORDER[(idx + 1) % 4]];
  if (product.climateSuitability.some(s => adjacent.includes(s))) return 62;

  let boost = 0;
  if (ctx.climate.uvIndex >= 7 && product.targetConcerns.includes('pigmentation')) boost += 20;
  if (ctx.climate.uvIndex >= 7 && product.targetConcerns.includes('aging')) boost += 15;
  if (ctx.climate.humidity < 35 && product.targetConcerns.includes('hydration')) boost += 25;
  if (ctx.climate.humidity > 70 && product.targetConcerns.includes('pores')) boost += 20;
  if (ctx.climate.temperature < 5 && product.category === 'moisturizer') boost += 15;
  if (ctx.climate.temperature > 30 && product.targetConcerns.includes('redness')) boost += 15;

  return Math.min(95, 35 + boost);
}
