import type {
  Product, Ingredient, Recommendation, RecommendationInput,
  ScorerContext, SkinReport,
} from './types';
import { scoreConcern } from './scorers/concern-scorer';
import { scoreDosha } from './scorers/dosha-scorer';
import { scoreClimate } from './scorers/climate-scorer';
import { scoreIngredients } from './scorers/ingredient-scorer';
import { generateReasoning } from './reasoning-generator';
import { buildSkinReport } from './report-builder';

export class RecommendationEngine {
  private products: Product[] = [];
  private ingredients: Map<string, Ingredient> = new Map();

  loadProducts(products: Product[]): void {
    this.products = products;
  }

  loadIngredients(ingredients: Ingredient[]): void {
    this.ingredients = new Map(ingredients.map(i => [i.id, i]));
  }

  generate(input: RecommendationInput): Recommendation[] {
    const ctx: ScorerContext = {
      skinScores: input.skinScores,
      dosha: input.dosha,
      climate: input.climate,
      ingredients: this.ingredients,
    };

    let candidates = this.products.filter(p => p.isActive);
    if (input.clinicId) candidates = candidates.filter(p => p.clinicId === input.clinicId);
    if (input.categoryFilter && input.categoryFilter !== 'all') candidates = candidates.filter(p => p.category === input.categoryFilter);

    const scored: Recommendation[] = candidates.map(product => {
      const concern = scoreConcern(product, ctx);
      const dosha = scoreDosha(product, ctx);
      const climate = scoreClimate(product, ctx);
      const ingredient = scoreIngredients(product, ctx);
      const rating = (product.rating / 5) * 100;

      const matchScore = Math.min(99, Math.max(5,
        concern * 0.40 + dosha * 0.20 + climate * 0.15 +
        ingredient * 0.15 + rating * 0.10
      ));

      return {
        product,
        matchScore: +matchScore.toFixed(1),
        rank: 0,
        reasoning: generateReasoning({
          product,
          concern,
          dosha,
          climateScore: climate,
          ingredient,
          skinScores: input.skinScores,
          doshaProfile: input.dosha,
          climate: input.climate,
        }),
        signalScores: {
          concern: +concern.toFixed(1),
          dosha: +dosha.toFixed(1),
          climate: +climate.toFixed(1),
          ingredient: +ingredient.toFixed(1),
          rating: +rating.toFixed(1),
        },
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    scored.forEach((rec, i) => { rec.rank = i + 1; });
    if (input.limit && input.limit > 0) return scored.slice(0, input.limit);
    return scored;
  }

  generateReport(input: RecommendationInput): SkinReport {
    return buildSkinReport(input.skinScores, input.dosha, input.climate, this.generate(input));
  }
}
