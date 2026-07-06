import { RecommendationEngine } from './engine';

const engine = new RecommendationEngine();

const result = engine.run({
  skinAnalysis: {
    overall: 74,
    hydration: 40,
    sensitivity: 80,
    redness: 65,
    pigmentation: 55,
    barrier: 45,
    texture: 60,
    oiliness: 50,
    dryness: 55,
  },
  climate: {
    temperature: 32,
    humidity: 25,
    uvIndex: 8,
    season: 'summer',
    pollution: 'high',
    location: 'Los Angeles',
  },
  dosha: {
    primary: 'pitta',
    secondary: 'vata',
    scores: { vata: 40, pitta: 70, kapha: 20 },
  },
  lifestyle: {
    sleepHours: 5,
    stressLevel: 80,
    sunscreenUse: 50,
    hydrationHabits: 5,
    screenTimeHours: 8,
  },
  goals: ['calm', 'protect'],
  skinType: 'sensitive',
  country: 'US',
  budget: 60,
});

console.log(JSON.stringify(result, null, 2));
