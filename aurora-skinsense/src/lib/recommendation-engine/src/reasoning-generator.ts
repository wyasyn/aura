import type { Product, SkinScores, DoshaProfile, ClimateData } from './types';

const LABELS: Record<string, string> = {
  pigmentation: 'Pigmentation', redness: 'Redness', wrinkles: 'Wrinkles',
  pores: 'Pores', hydration: 'Dehydration', aging: 'Aging',
  texture: 'Texture', sensitivity: 'Sensitivity',
};

export function generateReasoning(input: {
  product: Product;
  concern: number;
  dosha: number;
  climateScore: number;
  ingredient: number;
  skinScores: SkinScores;
  doshaProfile: DoshaProfile;
  climate: ClimateData;
}): string[] {
  const reasons: string[] = [];
  const scores = ctxSkinScores(input.skinScores);

  if (input.concern >= 50) {
    const matched = input.product.targetConcerns.filter(c => {
      const v = scores[c];
      if (v === undefined) return false;
      if (c === 'hydration') return v < 60;
      return v > 40;
    });
      if (matched.length > 0) {
        const topConcern = matched[0]! as string;
        const topVal = (scores as Record<string, number>)[topConcern] ?? 0;
        const labels = matched.map(c => LABELS[c] || c);
        const topScore = topConcern === 'hydration' ? 100 - topVal : topVal;
      reasons.push(`Targets your elevated ${labels.join(' and ')} (score: ${Math.round(topScore)}/100)`);
    }
  }

  if (input.dosha >= 65) {
    const name = input.doshaProfile.primary.charAt(0).toUpperCase() + input.doshaProfile.primary.slice(1);
    reasons.push(`Aligned with your ${name} dosha constitution`);
  }

  if (input.climateScore >= 60) {
    reasons.push(`Suited for ${input.climate.season} (${input.climate.humidity}% humidity, UV ${input.climate.uvIndex})`);
  }

  if (input.ingredient >= 85) {
    reasons.push('All ingredients safe for your sensitivity level');
  } else if (input.ingredient < 60) {
    reasons.push('Contains active ingredients — patch test recommended');
  }

  const notes = input.product.ayurvedicNotes;
  if (notes && notes.length > 0) {
      const rawStr = String(notes);
      const idx = rawStr.indexOf('.');
      const sentence = (idx === -1 ? rawStr : rawStr.slice(0, idx)).trim();
    if (sentence.length > 10 && sentence.length < 120) {
      reasons.push(sentence + '.');
    }
  }

  return reasons.slice(0, 4);
}

function ctxSkinScores(s: SkinScores): Record<string, number> {
  return {
    pigmentation: s.pigmentation,
    redness: s.redness,
    wrinkles: s.wrinkles,
    pores: s.pores,
    hydration: s.hydration,
    aging: s.aging,
    texture: s.texture,
    sensitivity: s.sensitivity,
    overall: s.overall,
  };
}