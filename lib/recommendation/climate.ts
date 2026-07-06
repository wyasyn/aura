import { clamp, normalize } from './scoring';
import type { ClimateData, RecommendationInput, RecommendationSignal } from './types';

export interface ClimateRecommendation {
  /** The environmental factor being evaluated. */
  factor: 'temperature' | 'humidity' | 'uv' | 'aqi';
  /** A short label for the detected condition. */
  label: string;
  /** A human-readable recommendation for the user. */
  recommendation: string;
  /** A severity-style band for the condition. */
  severity: 'low' | 'moderate' | 'high';
}

export interface ClimateInput {
  /** Current temperature in Celsius. */
  temperature: number;
  /** Current humidity percentage. */
  humidity: number;
  /** Current UV index. */
  uvIndex: number;
  /** Current AQI value. */
  aqi: number;
}

export function getClimateRecommendations(input: ClimateInput): ClimateRecommendation[] {
  const recommendations: ClimateRecommendation[] = [];

  if (input.uvIndex >= 6) {
    recommendations.push({
      factor: 'uv',
      label: 'High UV',
      recommendation: 'Recommend SPF 50 and reapply during extended sun exposure.',
      severity: 'high',
    });
  } else if (input.uvIndex >= 3) {
    recommendations.push({
      factor: 'uv',
      label: 'Moderate UV',
      recommendation: 'Recommend daily SPF and sun protection accessories.',
      severity: 'moderate',
    });
  }

  if (input.humidity <= 35) {
    recommendations.push({
      factor: 'humidity',
      label: 'Low humidity',
      recommendation: 'Recommend ceramides and a richer moisturizer to support the skin barrier.',
      severity: 'high',
    });
  } else if (input.humidity <= 55) {
    recommendations.push({
      factor: 'humidity',
      label: 'Moderate humidity',
      recommendation: 'Recommend a balanced moisturizer and lightweight hydration support.',
      severity: 'moderate',
    });
  }

  if (input.aqi >= 100) {
    recommendations.push({
      factor: 'aqi',
      label: 'High pollution',
      recommendation: 'Recommend double cleansing and antioxidant support after exposure.',
      severity: 'high',
    });
  } else if (input.aqi >= 50) {
    recommendations.push({
      factor: 'aqi',
      label: 'Moderate pollution',
      recommendation: 'Recommend gentle cleansing and barrier-repair products.',
      severity: 'moderate',
    });
  }

  if (input.temperature >= 30) {
    recommendations.push({
      factor: 'temperature',
      label: 'High temperature',
      recommendation: 'Recommend lightweight hydration and cooling, non-comedogenic products.',
      severity: 'high',
    });
  } else if (input.temperature <= 10) {
    recommendations.push({
      factor: 'temperature',
      label: 'Low temperature',
      recommendation: 'Recommend richer textures and occlusive support for comfort.',
      severity: 'moderate',
    });
  }

  return recommendations;
}

export function buildClimateSignal(input: RecommendationInput): RecommendationSignal {
  const climate = input.climate;
  const seasonScore = scoreSeason(climate.season);
  const humidityScore = normalize(climate.humidity, 20, 90);
  const uvScore = normalize(climate.uvIndex, 0, 10);
  const temperatureScore = normalize(climate.temperature, 5, 35);

  const score = clamp((seasonScore + humidityScore + uvScore + temperatureScore) / 4, 0, 1);

  return {
    module: 'climate',
    score,
    reasons: [
      `Climate context: ${climate.season} conditions with UV ${climate.uvIndex.toFixed(0)}`,
      'Seasonal resilience is considered before product selection.',
    ],
  };
}

function scoreSeason(season: ClimateData['season']): number {
  switch (season) {
    case 'summer':
      return 0.8;
    case 'winter':
      return 0.6;
    case 'autumn':
      return 0.7;
    default:
      return 0.65;
  }
}
