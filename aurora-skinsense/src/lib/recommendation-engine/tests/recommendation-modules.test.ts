import { RecommendationEngine } from '../../../../../lib/recommendation/engine';
import { getClimateRecommendations } from '../../../../../lib/recommendation/climate';
import { findCompatibleIngredients, findConflictingIngredients, findIngredientsByCondition, recommendIngredients } from '../../../../../lib/recommendation/ingredients';
import { getDoshaRecommendations } from '../../../../../lib/recommendation/dosha';
import { getLifestyleRecommendations } from '../../../../../lib/recommendation/lifestyle';
import { combineScores, scoreSeverity, scoreSkinAnalysis, summarizeSeverity } from '../../../../../lib/recommendation/scoring';
import type { ClimateData, DoshaProfile, LifestyleProfile, SkinAnalysis } from '../../../../../lib/recommendation/types';
import type { RecommendationEngineInput } from '../../../../../lib/recommendation/engine';

describe('recommendation engine modules', () => {
  const sampleSkinAnalysis: SkinAnalysis = {
    overall: 78,
    hydration: 42,
    sensitivity: 83,
    redness: 76,
    pigmentation: 68,
    barrier: 48,
    texture: 57,
    oiliness: 64,
    dryness: 55,
  };

  const sampleClimate: ClimateData = {
    temperature: 33,
    humidity: 24,
    uvIndex: 9,
    season: 'summer',
    pollution: 'high',
    location: 'Lisbon',
  };

  const sampleDosha: DoshaProfile = {
    primary: 'pitta',
    secondary: 'vata',
    scores: { vata: 0.3, pitta: 0.7, kapha: 0.1 },
  };

  const sampleLifestyle: LifestyleProfile = {
    sleepHours: 5.5,
    stressLevel: 82,
    sunscreenUse: 20,
    hydrationHabits: 35,
    screenTimeHours: 8,
  };

  const sampleEngineInput: RecommendationEngineInput = {
    skinAnalysis: sampleSkinAnalysis,
    climate: sampleClimate,
    dosha: sampleDosha,
    lifestyle: sampleLifestyle,
    goals: ['calm', 'protect'],
    skinType: 'sensitive',
    country: 'US',
    budget: 70,
  };

  describe('severity scoring', () => {
    test('maps representative values to the correct severity bands', () => {
      expect(scoreSeverity(0)).toBe('none');
      expect(scoreSeverity(12)).toBe('mild');
      expect(scoreSeverity(35)).toBe('moderate');
      expect(scoreSeverity(60)).toBe('high');
      expect(scoreSeverity(90)).toBe('severe');
    });

    test('combines weighted scores and rejects mismatched arrays', () => {
      expect(combineScores([0.2, 0.8, 0.4], [1, 1, 1])).toBeCloseTo(0.4666666667);
      expect(() => combineScores([1], [1, 2])).toThrow('Scores and weights must have the same length.');
    });

    test('transforms a full skin-analysis payload into a severity map and summary', () => {
      const severityMap = scoreSkinAnalysis({
        hydration: sampleSkinAnalysis.hydration,
        sensitivity: sampleSkinAnalysis.sensitivity,
        redness: sampleSkinAnalysis.redness,
        pigmentation: sampleSkinAnalysis.pigmentation,
        barrier: sampleSkinAnalysis.barrier,
        texture: sampleSkinAnalysis.texture,
        oiliness: sampleSkinAnalysis.oiliness,
        dryness: sampleSkinAnalysis.dryness,
      });
      const summary = summarizeSeverity({
        hydration: sampleSkinAnalysis.hydration,
        sensitivity: sampleSkinAnalysis.sensitivity,
        redness: sampleSkinAnalysis.redness,
        pigmentation: sampleSkinAnalysis.pigmentation,
        barrier: sampleSkinAnalysis.barrier,
        texture: sampleSkinAnalysis.texture,
        oiliness: sampleSkinAnalysis.oiliness,
        dryness: sampleSkinAnalysis.dryness,
      });

      expect(severityMap).toEqual(expect.objectContaining({
        hydration: 'moderate',
        sensitivity: 'severe',
        redness: 'severe',
        pigmentation: 'high',
      }));
      expect(summary).toEqual(expect.arrayContaining([
        expect.objectContaining({ key: 'sensitivity', severity: 'severe' }),
      ]));
    });
  });

  describe('climate rules', () => {
    test('returns high-priority recommendations for intense climate conditions', () => {
      const recommendations = getClimateRecommendations({
        temperature: 33,
        humidity: 24,
        uvIndex: 9,
        aqi: 140,
      });

      expect(recommendations).toEqual(expect.arrayContaining([
        expect.objectContaining({ factor: 'uv', label: 'High UV' }),
        expect.objectContaining({ factor: 'humidity', label: 'Low humidity' }),
        expect.objectContaining({ factor: 'aqi', label: 'High pollution' }),
        expect.objectContaining({ factor: 'temperature', label: 'High temperature' }),
      ]));
    });

    test('returns only moderate guidance for mild conditions', () => {
      const recommendations = getClimateRecommendations({
        temperature: 21,
        humidity: 45,
        uvIndex: 2,
        aqi: 20,
      });

      expect(recommendations).toEqual([
        expect.objectContaining({ factor: 'humidity', label: 'Moderate humidity' }),
      ]);
    });
  });

  describe('ingredient recommendations', () => {
    test('finds ingredients by concern and returns compatible or conflicting options', () => {
      const acneMatches = findIngredientsByCondition('acne');
      const compatible = findCompatibleIngredients('Niacinamide');
      const conflicting = findConflictingIngredients('Niacinamide');

      expect(acneMatches.map((ingredient: { name: string }) => ingredient.name)).toContain('Salicylic Acid');
      expect(compatible.map((ingredient: { name: string }) => ingredient.name)).toContain('Ceramides');
      expect(conflicting.map((ingredient: { name: string }) => ingredient.name)).toEqual([]);
    });

    test('filters ingredients by condition, skin type, and query', () => {
      const hydratedDry = recommendIngredients({ condition: 'hydration', skinType: 'dry' });
      const queryMatches = recommendIngredients({ query: 'cer' });
      const noMatches = recommendIngredients({ query: 'zzzz' });

      expect(hydratedDry.map((ingredient: { name: string }) => ingredient.name)).toContain('Hyaluronic Acid');
      expect(queryMatches.map((ingredient: { name: string }) => ingredient.name)).toContain('Ceramides');
      expect(noMatches).toEqual([]);
    });
  });

  describe('dosha rules', () => {
    test('returns calming guidance for pitta and nourishing guidance for vata', () => {
      const pitta = getDoshaRecommendations({ dosha: 'pitta' });
      const vata = getDoshaRecommendations({ dosha: 'vata' });
      const kapha = getDoshaRecommendations({ dosha: 'kapha' });

      expect(pitta[0]).toEqual(expect.objectContaining({ dosha: 'pitta', label: 'Cool and soothing' }));
      expect(vata[0]).toEqual(expect.objectContaining({ dosha: 'vata', label: 'Nourishing and grounding' }));
      expect(kapha[0]).toEqual(expect.objectContaining({ dosha: 'kapha', label: 'Light and clarifying' }));
    });

    test('returns no guidance for unsupported dosha values', () => {
      expect(getDoshaRecommendations({ dosha: 'tridoshic' as never }).length).toBe(0);
    });
  });

  describe('lifestyle rules', () => {
    test('returns recommendations when habits indicate stress or poor recovery', () => {
      const recommendations = getLifestyleRecommendations({
        sleep: 5,
        stress: 82,
        water: 1.4,
        exercise: 1,
        smoking: 1,
        alcohol: 1,
        diet: 'fast food',
      });

      expect(recommendations).toEqual(expect.arrayContaining([
        expect.objectContaining({ factor: 'sleep', severity: 'high' }),
        expect.objectContaining({ factor: 'stress', severity: 'high' }),
        expect.objectContaining({ factor: 'water', severity: 'moderate' }),
        expect.objectContaining({ factor: 'diet', severity: 'moderate' }),
      ]));
    });

    test('returns no recommendations for healthy habits', () => {
      const recommendations = getLifestyleRecommendations({
        sleep: 8,
        stress: 20,
        water: 2.5,
        exercise: 4,
        smoking: 0,
        alcohol: 0,
        diet: 'balanced',
      });

      expect(recommendations).toEqual([]);
    });
  });

  describe('recommendation engine', () => {
    test('produces a full recommendation payload for realistic input', () => {
      const engine = new RecommendationEngine();
      const output = engine.run(sampleEngineInput);

      expect(output.skinSummary).toContain('concern');
      expect(output.recommendedIngredients).toEqual(expect.arrayContaining(['Aloe Vera', 'Centella', 'Panthenol']));
      expect(output.avoidIngredients).toEqual(expect.arrayContaining(['Fragrance', 'Harsh exfoliants']));
      expect(output.climateAdvice.length).toBeGreaterThan(0);
      expect(output.lifestyleAdvice.length).toBeGreaterThan(0);
      expect(output.routine.length).toBeGreaterThan(0);
      expect(output.recommendedProducts).toEqual([]);
      expect(output.confidenceScore).toBeGreaterThan(0);
      expect(output.confidenceScore).toBeLessThanOrEqual(100);
      expect(output.explanation).toContain('rule-based');
    });

    test('falls back to a basic ingredient set when no rule matches', () => {
      const engine = new RecommendationEngine();
      const neutralOutput = engine.run({
        skinAnalysis: {
          overall: 50,
          hydration: 50,
          sensitivity: 20,
          redness: 20,
          pigmentation: 20,
          barrier: 60,
          texture: 50,
          oiliness: 20,
          dryness: 20,
        },
        climate: {
          temperature: 22,
          humidity: 50,
          uvIndex: 2,
          season: 'spring',
          pollution: 'low',
          location: 'Copenhagen',
        },
        dosha: {
          primary: 'tridoshic',
          secondary: 'vata',
          scores: { vata: 0.3, pitta: 0.3, kapha: 0.3 },
        },
        lifestyle: {
          sleepHours: 8,
          stressLevel: 20,
          sunscreenUse: 70,
          hydrationHabits: 80,
          screenTimeHours: 3,
        },
        goals: ['balance'],
      });

      expect(neutralOutput.recommendedIngredients).toEqual(['Ceramides', 'Niacinamide']);
      expect(neutralOutput.avoidIngredients).toEqual([]);
    });
  });
});
