import type {
  SkinScores, DoshaProfile, ClimateData,
  SkinReport, SkinConcern, DoshaInterpretation,
  ClimateGuidance, Recommendation,
} from './types';

const CONCERN_INFO: Record<string, { high: string; low: string }> = {
  pigmentation: { high: 'Significant pigmentation irregularities — brightening actives recommended', low: 'Even skin tone with minimal pigmentation' },
  redness: { high: 'Notable redness and inflammation — soothing ingredients recommended', low: 'Calm skin with minimal redness' },
  wrinkles: { high: 'Visible lines and loss of firmness — anti-aging actives recommended', low: 'Smooth skin with minimal lines' },
  pores: { high: 'Enlarged or congested pores — purifying products recommended', low: 'Refined pores with minimal congestion' },
  hydration: { high: 'Well-hydrated skin with healthy barrier', low: 'Dehydrated skin — barrier support needed' },
  aging: { high: 'Multiple aging signs detected', low: 'Youthful skin with minimal aging' },
  texture: { high: 'Uneven texture — exfoliation recommended', low: 'Smooth, even skin texture' },
  sensitivity: { high: 'Elevated sensitivity — gentle products only', low: 'Resilient skin with low reactivity' },
};

function buildConcerns(scores: SkinScores): SkinConcern[] {
  const keys: (keyof SkinScores)[] = ['pigmentation', 'redness', 'wrinkles', 'pores', 'hydration', 'aging', 'texture', 'sensitivity'];
  return keys.map(key => {
    const score = scores[key];
    const effective = key === 'hydration' ? 100 - score : score;
    const info = CONCERN_INFO[key as keyof typeof CONCERN_INFO]!;
    return {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      score,
      severity: effective >= 65 ? 'high' as const : effective >= 35 ? 'moderate' as const : 'low' as const,
      description: effective >= 65 ? info.high : info.low,
    };
  }).sort((a, b) => {
    const aE = a.name === 'Hydration' ? 100 - a.score : a.score;
    const bE = b.name === 'Hydration' ? 100 - b.score : b.score;
    return bE - aE;
  });
}

const DOSHA_INFO: Record<string, { skinType: string; strengths: string[]; vulnerabilities: string[]; approach: string }> = {
  vata: { skinType: 'Vata (Air + Ether) — Dry, Thin, Cool', strengths: ['Fine-pored, delicate texture', 'Less prone to heat breakouts', 'Ages slowly when moisturized'], vulnerabilities: ['Dehydration and flakiness', 'Premature fine lines', 'Moisture loss in dry conditions'], approach: 'Prioritize rich Snigdha formulations with warming oils. Layer humectants sealed by emollients. Avoid alcohol-based products.' },
  pitta: { skinType: 'Pitta (Fire + Water) — Sensitive, Warm, Fair', strengths: ['Good circulation gives natural glow', 'Ages evenly when protected', 'Responsive to targeted treatments'], vulnerabilities: ['Redness, rosacea, inflammation', 'UV-sensitive, hyperpigmentation risk', 'Reacts to heat and stress'], approach: 'Use cooling Sita ingredients: Sandalwood, Aloe, Cica, Turmeric. SPF 50+ mandatory. Avoid steam and over-stimulating actives.' },
  kapha: { skinType: 'Kapha (Earth + Water) — Oily, Thick, Smooth', strengths: ['Naturally well-lubricated', 'Ages very slowly', 'Strong barrier function'], vulnerabilities: ['Excess oil and congestion', 'Enlarged pores, cystic acne', 'Dullness without exfoliation'], approach: 'Use lightweight non-comedogenic textures. Prioritize Shodhana with Neem, Green Tea, Clay, BHA. Avoid heavy oils.' },
  tridoshic: { skinType: 'Tridoshic — Balanced, Adaptable', strengths: ['Balanced moisture and oil', 'Adapts to seasonal changes', 'Rarely extreme in any metric'], vulnerabilities: ['Seasonal dosha shifts', 'Needs routine adjustment', 'Mild combination concerns'], approach: 'Follow balanced baseline, adjust seasonally: add moisture in winter, SPF in summer, exfoliation in spring. Use adaptogens like Tulsi.' },
};

function buildDosha(dosha: DoshaProfile): DoshaInterpretation {
  const info = DOSHA_INFO[dosha.primary as keyof typeof DOSHA_INFO] ?? DOSHA_INFO.tridoshic;
  return { primary: dosha.primary, secondary: dosha.secondary, skinType: info!.skinType, strengths: info!.strengths, vulnerabilities: info!.vulnerabilities, recommendedApproach: info!.approach };
}

function buildClimate(climate: ClimateData): ClimateGuidance {
  const { humidity, uvIndex, temperature, season } = climate;
  let humidityGuidance: string;
  if (humidity < 30) humidityGuidance = `Very low humidity (${humidity}%) — layer humectants sealed with occlusives.`;
  else if (humidity < 50) humidityGuidance = `Low-moderate humidity (${humidity}%) — maintain hydration layer.`;
  else if (humidity < 70) humidityGuidance = `Comfortable humidity (${humidity}%) — no moisture stress.`;
  else humidityGuidance = `High humidity (${humidity}%) — switch to lightweight non-comedogenic textures.`;

  let uvGuidance: string;
  if (uvIndex >= 8) uvGuidance = `Very high UV (${uvIndex}) — SPF 50+ essential. Reapply every 2 hours.`;
  else if (uvIndex >= 5) uvGuidance = `Moderate UV (${uvIndex}) — daily SPF 30+ recommended.`;
  else if (uvIndex >= 3) uvGuidance = `Low-moderate UV (${uvIndex}) — SPF beneficial but less critical.`;
  else uvGuidance = `Low UV (${uvIndex}) — minimal protection needed.`;

  let temperatureGuidance: string;
  if (temperature > 30) temperatureGuidance = `High temperature (${Math.round(temperature)}°C) — use cooling ingredients. Avoid hot water.`;
  else if (temperature > 15) temperatureGuidance = `Mild temperature (${Math.round(temperature)}°C) — no adjustments needed.`;
  else if (temperature > 0) temperatureGuidance = `Cool temperature (${Math.round(temperature)}°C) — increase emollient use.`;
  else temperatureGuidance = `Freezing (${Math.round(temperature)}°C) — rich barrier-repair creams essential.`;

  let productTextureAdvice: string;
  if (season === 'summer' || humidity > 65) productTextureAdvice = 'Use lightweight gels, water-based serums, fluid lotions.';
  else if (season === 'winter' || humidity < 35) productTextureAdvice = 'Use rich creams and facial oils. Layer: serum, moisturizer, oil.';
  else if (season === 'spring') productTextureAdvice = 'Transition to lighter textures. Add gentle exfoliation.';
  else productTextureAdvice = 'Medium-weight creams and serums.';

  return { season, humidityGuidance, uvGuidance, temperatureGuidance, productTextureAdvice };
}

export function buildSkinReport(skinScores: SkinScores, dosha: DoshaProfile, climate: ClimateData, recommendations: Recommendation[]): SkinReport {
  return {
    skinScores, dosha, climate,
    primaryConcerns: buildConcerns(skinScores),
    doshaInterpretation: buildDosha(dosha),
    climateGuidance: buildClimate(climate),
    recommendations,
    generatedAt: new Date().toISOString(),
    disclaimer: 'This report is generated by AI screening technology and is NOT a medical diagnosis. Please consult a qualified dermatologist for medical skin conditions.',
  };
}
