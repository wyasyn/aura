import { getClimateRecommendations } from './climate';

const recommendations = getClimateRecommendations({
  temperature: 32,
  humidity: 25,
  uvIndex: 8,
  aqi: 140,
});

console.log(JSON.stringify(recommendations, null, 2));
