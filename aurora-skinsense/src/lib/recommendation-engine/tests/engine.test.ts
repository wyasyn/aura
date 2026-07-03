/// <reference types="jest" />
import { RecommendationEngine } from '../src/engine';
import { REFERENCE_PRODUCTS } from '../src/data/products';
import { REFERENCE_INGREDIENTS } from '../src/data/ingredients';
import type { SkinScores, DoshaProfile, ClimateData } from '../src/types';

const DRY_VATA: SkinScores = { pigmentation: 30, redness: 25, wrinkles: 55, pores: 20, hydration: 25, aging: 45, texture: 35, sensitivity: 30, overall: 55 };
const OILY_KAPHA: SkinScores = { pigmentation: 35, redness: 30, wrinkles: 15, pores: 75, hydration: 85, aging: 15, texture: 65, sensitivity: 20, overall: 60 };
const SENSITIVE_PITTA: SkinScores = { pigmentation: 50, redness: 80, wrinkles: 20, pores: 25, hydration: 55, aging: 30, texture: 30, sensitivity: 85, overall: 40 };

const VATA: DoshaProfile = { primary: 'vata', secondary: 'pitta', scores: { vata: 4, pitta: 1, kapha: 0 } };
const KAPHA: DoshaProfile = { primary: 'kapha', secondary: 'pitta', scores: { vata: 0, pitta: 1, kapha: 4 } };
const PITTA: DoshaProfile = { primary: 'pitta', secondary: 'vata', scores: { vata: 1, pitta: 4, kapha: 0 } };

const WINTER: ClimateData = { temperature: 5, humidity: 30, uvIndex: 2, season: 'winter', pollution: 'low', location: 'Test' };
const SUMMER: ClimateData = { temperature: 32, humidity: 75, uvIndex: 9, season: 'summer', pollution: 'moderate', location: 'Test' };

let engine: RecommendationEngine;
beforeEach(() => {
  engine = new RecommendationEngine();
  engine.loadIngredients(REFERENCE_INGREDIENTS);
  engine.loadProducts(REFERENCE_PRODUCTS);
});

function run(skin: SkinScores, dosha: DoshaProfile, climate: ClimateData) {
  return engine.generate({ skinScores: skin, dosha, climate });
}

test('returns results for valid input', () => {
  expect(run(DRY_VATA, VATA, WINTER).length).toBeGreaterThan(0);
});

test('scores between 5 and 99', () => {
  for (const r of run(DRY_VATA, VATA, WINTER)) {
    expect(r.matchScore).toBeGreaterThanOrEqual(5);
    expect(r.matchScore).toBeLessThanOrEqual(99);
  }
});

test('sorted descending by match score', () => {
  const results = run(DRY_VATA, VATA, WINTER);
  for (let i = 1; i < results.length; i++) {
    expect(results[i - 1]!.matchScore).toBeGreaterThanOrEqual(results[i]!.matchScore);
  }
});

test('ranks are sequential from 1', () => {
  run(OILY_KAPHA, KAPHA, SUMMER).forEach((r, i) => expect(r.rank).toBe(i + 1));
});

test('every result has reasoning', () => {
  for (const r of run(SENSITIVE_PITTA, PITTA, SUMMER)) {
    expect(r.reasoning.length).toBeGreaterThanOrEqual(1);
    expect(r.reasoning.length).toBeLessThanOrEqual(4);
  }
});

test('dry Vata skin gets hydrating product first', () => {
  expect(run(DRY_VATA, VATA, WINTER)[0]!.product.id).toBe('aurora-hydrate');
});

test('oily Kapha skin gets pore product ranked high', () => {
  const results = run(OILY_KAPHA, KAPHA, SUMMER);
  const ids = results.map(r => r.product.id);
  expect(ids).toContain('aurora-purify');
  const poreRank = results.find(r => r.product.id === 'aurora-purify')!.rank;
  const hydrateRank = results.find(r => r.product.id === 'aurora-hydrate')!.rank;
  expect(poreRank).toBeLessThan(hydrateRank);
});

test('sensitive Pitta skin gets calming product first', () => {
  expect(run(SENSITIVE_PITTA, PITTA, SUMMER)[0]!.product.id).toBe('aurora-calm');
});

test('category filter works', () => {
  const results = engine.generate({ skinScores: DRY_VATA, dosha: VATA, climate: WINTER, categoryFilter: 'serum' });
  for (const r of results) expect(r.product.category).toBe('serum');
});

test('clinic filter works', () => {
  engine.loadProducts([...REFERENCE_PRODUCTS, {
    id: 'other', clinicId: 'other-clinic', name: 'Other', category: 'serum', subCategory: 'X', description: 'X', price: 10, currency: 'USD', ingredientIds: ['niacinamide'], targetConcerns: ['texture'], doshaCompatibility: ['vata'], climateSuitability: ['winter'], skinTypes: ['All'], rating: 4.0, reviewCount: 5, image: '', ayurvedicNotes: '', isActive: true, createdAt: '', updatedAt: '',
  }]);
  const results = engine.generate({ skinScores: DRY_VATA, dosha: VATA, climate: WINTER, clinicId: 'aurora' });
  expect(results.every(r => r.product.clinicId === 'aurora')).toBe(true);
});

test('limit works', () => {
  expect(engine.generate({ skinScores: DRY_VATA, dosha: VATA, climate: WINTER, limit: 2 }).length).toBe(2);
});

test('added product appears in results', () => {
  engine.loadProducts([...REFERENCE_PRODUCTS, {
    id: 'new-vata', clinicId: 'aurora', name: 'New Vata Oil', category: 'serum', subCategory: 'Nourishing', description: 'For Vata', price: 55, currency: 'USD', ingredientIds: ['hyaluronic-acid', 'squalane'], targetConcerns: ['hydration', 'wrinkles'], doshaCompatibility: ['vata'], climateSuitability: ['winter'], skinTypes: ['Dry'], rating: 4.9, reviewCount: 10, image: '', ayurvedicNotes: '', isActive: true, createdAt: '', updatedAt: '',
  }]);
  expect(run(DRY_VATA, VATA, WINTER).map(r => r.product.id)).toContain('new-vata');
});

test('removed product (isActive=false) disappears', () => {
  engine.loadProducts(REFERENCE_PRODUCTS.map(p => p.id === 'aurora-hydrate' ? { ...p, isActive: false } : p));
  expect(run(DRY_VATA, VATA, WINTER).map(r => r.product.id)).not.toContain('aurora-hydrate');
});

test('generateReport returns full report', () => {
  const report = engine.generateReport({ skinScores: DRY_VATA, dosha: VATA, climate: WINTER });
  expect(report.primaryConcerns.length).toBe(8);
  expect(report.doshaInterpretation.skinType).toContain('Vata');
  expect(report.climateGuidance.season).toBe('winter');
  expect(report.recommendations.length).toBeGreaterThan(0);
  expect(report.disclaimer).toContain('NOT a medical diagnosis');
});

test('report concerns sorted by severity', () => {
  const report = engine.generateReport({ skinScores: SENSITIVE_PITTA, dosha: PITTA, climate: SUMMER });
  expect(report.primaryConcerns[0]!.name).toBe('Sensitivity');
  expect(report.primaryConcerns[0]!.severity).toBe('high');
});

test('retinol product penalized for sensitive user', () => {
  const results = run(SENSITIVE_PITTA, PITTA, WINTER);
  const nightRepair = results.find(r => r.product.id === 'aurora-night-repair');
  const calmBalm = results.find(r => r.product.id === 'aurora-calm');
  expect(calmBalm!.signalScores.ingredient).toBeGreaterThan(nightRepair!.signalScores.ingredient);
});
