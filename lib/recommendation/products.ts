import type { Product, RecommendationInput } from './types';

export interface AuroraProduct {
  /** Stable identifier for the product. */
  id: string;
  /** Product display name. */
  name: string;
  /** Category of the product. */
  category: string;
  /** Ingredients the product contains. */
  ingredients: string[];
  /** Skin types the product is intended for. */
  skinTypes: string[];
  /** Suggested retail price in the local currency. */
  price: number;
  /** Country or region where the product is available. */
  country: string;
  /** Whether the product is active and available. */
  isActive: boolean;
}

export interface ProductMatchInput {
  /** Recommended ingredient names to match. */
  recommendedIngredients: string[];
  /** User skin type. */
  skinType: string;
  /** User budget. */
  budget: number;
  /** User country. */
  country: string;
}

export interface ProductMatchResult extends AuroraProduct {
  /** Match score from 0 to 100. */
  score: number;
}

/**
 * Repository abstraction for product data.
 * This can later be swapped for a database-backed implementation.
 */
export interface ProductRepository {
  listProducts(): AuroraProduct[];
}

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly products: AuroraProduct[]) {}

  listProducts(): AuroraProduct[] {
    return this.products;
  }
}

/**
 * Returns products matching a user query, ranked by relevance.
 * Returns an empty array if no suitable products are available.
 */
export function findMatchingProducts(
  input: ProductMatchInput,
  repository: ProductRepository,
): ProductMatchResult[] {
  const products = repository.listProducts().filter((product) => product.isActive);

  const scored = products
    .map((product) => {
      const ingredientMatches = input.recommendedIngredients.filter((ingredient) =>
        product.ingredients.some((productIngredient) => productIngredient.toLowerCase() === ingredient.toLowerCase()),
      ).length;

      const skinTypeMatch = product.skinTypes.some((skinType) => skinType.toLowerCase() === input.skinType.toLowerCase()) ? 1 : 0;
      const countryMatch = product.country.toLowerCase() === input.country.toLowerCase() ? 1 : 0;
      const budgetFit = product.price <= input.budget ? 1 : 0;

      const score = Math.round(
        ingredientMatches * 40 +
          skinTypeMatch * 25 +
          countryMatch * 20 +
          budgetFit * 15,
      );

      return {
        ...product,
        score,
      } satisfies ProductMatchResult;
    })
    .filter((product) => product.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored;
}

export function getProductCatalog(): Product[] {
  return [];
}

export function filterProducts(input: RecommendationInput, products: Product[]): Product[] {
  return products.filter((product) => {
    if (!product.isActive) {
      return false;
    }

    if (input.preferredCategories?.length) {
      return input.preferredCategories.includes(product.category);
    }

    return true;
  });
}
