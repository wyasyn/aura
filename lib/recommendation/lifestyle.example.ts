import { getLifestyleRecommendations } from './lifestyle';

console.log(JSON.stringify(getLifestyleRecommendations({
  sleep: 5,
  stress: 80,
  water: 1.5,
  exercise: 1,
  smoking: 1,
  alcohol: 0,
  diet: 'poor diet',
}), null, 2));
