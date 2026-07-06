import { getDoshaRecommendations } from './dosha';

console.log(JSON.stringify(getDoshaRecommendations({ dosha: 'pitta' }), null, 2));
