import { findMatchingProducts, InMemoryProductRepository } from './products';

const repository = new InMemoryProductRepository([
  {
    id: 'aurora-01',
    name: 'Barrier Recovery Serum',
    category: 'serum',
    ingredients: ['niacinamide', 'ceramides'],
    skinTypes: ['dry', 'sensitive'],
    price: 42,
    country: 'US',
    isActive: true,
  },
  {
    id: 'aurora-02',
    name: 'Hydration Gel',
    category: 'moisturizer',
    ingredients: ['hyaluronic acid', 'glycerin'],
    skinTypes: ['oily', 'combination'],
    price: 28,
    country: 'US',
    isActive: true,
  },
]);

console.log(
  JSON.stringify(
    findMatchingProducts(
      {
        recommendedIngredients: ['niacinamide', 'ceramides'],
        skinType: 'dry',
        budget: 50,
        country: 'US',
      },
      repository,
    ),
    null,
    2,
  ),
);
