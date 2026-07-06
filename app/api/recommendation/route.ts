import { RecommendationEngine } from '../../../lib/recommendation/engine';
import type { ClimateData, DoshaProfile, Goal, LifestyleProfile, SkinAnalysis } from '../../../lib/recommendation/types';

const VALID_DOSHAS = new Set(['vata', 'pitta', 'kapha', 'tridoshic']);
const VALID_GOALS: Goal[] = ['glow', 'calm', 'repair', 'protect', 'balance'];
const VALID_POLLUTION = new Set(['low', 'moderate', 'high']);
const VALID_SEASONS = new Set(['spring', 'summer', 'autumn', 'winter']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateSkinAnalysis(value: unknown): value is SkinAnalysis {
  if (!isRecord(value)) {
    return false;
  }

  const required = ['overall', 'hydration', 'sensitivity', 'redness', 'pigmentation', 'barrier', 'texture', 'oiliness', 'dryness'] as const;
  return required.every((field) => isNumber(value[field]));
}

function validateClimate(value: unknown): value is ClimateData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.temperature) &&
    isNumber(value.humidity) &&
    isNumber(value.uvIndex) &&
    typeof value.season === 'string' &&
    VALID_SEASONS.has(value.season as ClimateData['season']) &&
    typeof value.pollution === 'string' &&
    VALID_POLLUTION.has(value.pollution as ClimateData['pollution']) &&
    typeof value.location === 'string'
  );
}

function validateDosha(value: unknown): value is DoshaProfile {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.primary !== 'string' || !VALID_DOSHAS.has(value.primary as DoshaProfile['primary'])) {
    return false;
  }

  if (typeof value.secondary !== 'string' || !VALID_DOSHAS.has(value.secondary as DoshaProfile['secondary'])) {
    return false;
  }

  if (!isRecord(value.scores)) {
    return false;
  }

  return isNumber(value.scores.vata) && isNumber(value.scores.pitta) && isNumber(value.scores.kapha);
}

function validateLifestyle(value: unknown): value is LifestyleProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.sleepHours) &&
    isNumber(value.stressLevel) &&
    isNumber(value.sunscreenUse) &&
    isNumber(value.hydrationHabits) &&
    isNumber(value.screenTimeHours)
  );
}

function validateSkinGoals(value: unknown): value is Goal[] {
  return Array.isArray(value) && value.every((goal) => typeof goal === 'string' && VALID_GOALS.includes(goal as Goal));
}

function validatePayload(payload: unknown): payload is {
  skinAnalysis: SkinAnalysis;
  climate: ClimateData;
  dosha: DoshaProfile;
  lifestyle: LifestyleProfile;
  skinGoals: Goal[];
} {
  if (!isRecord(payload)) {
    return false;
  }

  return (
    validateSkinAnalysis(payload.skinAnalysis) &&
    validateClimate(payload.climate) &&
    validateDosha(payload.dosha) &&
    validateLifestyle(payload.lifestyle) &&
    validateSkinGoals(payload.skinGoals)
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!validatePayload(payload)) {
      return Response.json(
        {
          error: 'Invalid request payload.',
          details: 'Expected skinAnalysis, climate, dosha, lifestyle, and skinGoals with the required shapes.',
        },
        { status: 400 },
      );
    }

    const engine = new RecommendationEngine();
    const result = engine.run({
      skinAnalysis: payload.skinAnalysis,
      climate: payload.climate,
      dosha: payload.dosha,
      lifestyle: payload.lifestyle,
      goals: payload.skinGoals,
    });

    return Response.json(
      {
        ...result,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return Response.json(
      {
        error: 'Failed to generate recommendation.',
        details: message,
      },
      { status: 500 },
    );
  }
}
