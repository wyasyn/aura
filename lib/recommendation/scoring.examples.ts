import { scoreSeverity, scoreSkinAnalysis, summarizeSeverity } from './scoring';

const exampleScores = {
  acne: 81,
  dryness: 30,
  oiliness: 72,
  pigmentation: 54,
};

const mapped = scoreSkinAnalysis(exampleScores);
const summary = summarizeSeverity(exampleScores);

console.log(mapped);
console.log(summary);

console.assert(scoreSeverity(0) === 'none');
console.assert(scoreSeverity(12) === 'mild');
console.assert(scoreSeverity(30) === 'moderate');
console.assert(scoreSeverity(60) === 'high');
console.assert(scoreSeverity(81) === 'severe');
console.assert(mapped.acne === 'severe');
console.assert(mapped.dryness === 'moderate');
console.assert(mapped.oiliness === 'high');
console.assert(mapped.pigmentation === 'high');
