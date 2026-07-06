import { applyRecommendationRules } from './rules';

const rules = applyRecommendationRules({
  acne: 'high',
  oiliness: 'high',
  dryness: 'severe',
  sensitivity: 'high',
  redness: 'high',
  pigmentation: 'high',
});

console.log(JSON.stringify(rules, null, 2));
