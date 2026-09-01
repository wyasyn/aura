import { CONCERN_OPTIONS } from "@/components/onboarding/wizard-state"
import {
  DIMENSION_HEADLINE_PHRASE,
  isSkinDimensionId,
  type SkinDimensionId,
} from "@/lib/scan/dimensions"
import type {
  AssessmentBand,
  ApplicationFrequency,
  ApplicationTime,
  SkinDimension,
} from "@/lib/scan/types"

const BAND_LABEL: Record<AssessmentBand, string> = {
  minimal: "Balanced",
  mild: "Mostly balanced",
  moderate: "Moderate",
  elevated: "Elevated",
  not_assessed: "Not assessed",
}

/**
 * Band-only headlines, used when no dimensions are available to name.
 *
 * One string has to cover every possible finding at that band, so these say
 * nothing specific. Prefer passing dimensions to `formatSkinHeadline` so the
 * headline can name what actually drove the band.
 */
const SKIN_HEADLINE: Record<AssessmentBand, string> = {
  minimal: "Generally balanced with negligible visible concerns",
  mild: "Mostly balanced with minor areas that could use gentle support",
  moderate: "Some visible cosmetic patterns worth addressing in your routine",
  elevated: "More noticeable cosmetic patterns worth prioritizing in your routine",
  not_assessed: "Not fully assessed in this scan",
}

export function formatBand(band: AssessmentBand) {
  return BAND_LABEL[band]
}

const BAND_SEVERITY: Record<AssessmentBand, number> = {
  not_assessed: -1,
  minimal: 0,
  mild: 1,
  moderate: 2,
  elevated: 3,
}

/** Naming more than two patterns stops reading as a headline. */
const MAX_LEAD_DIMENSIONS = 2

function bandSeverity(band: AssessmentBand): number {
  return BAND_SEVERITY[band] ?? -1
}

/**
 * The dimensions that actually drove the band: the most severe ones present,
 * as long as they are at mild or worse.
 *
 * Reading off `overallBand` alone would not work, since overallBand is raised a
 * step when any single dimension is elevated, so an elevated overall can sit on
 * moderate dimensions.
 */
function selectLeadPhrases(dimensions: SkinDimension[]): string[] {
  const candidates = dimensions.filter(
    (dimension) =>
      isSkinDimensionId(String(dimension.id)) &&
      bandSeverity(dimension.band) >= BAND_SEVERITY.mild,
  )
  if (candidates.length === 0) return []

  const topSeverity = Math.max(
    ...candidates.map((dimension) => bandSeverity(dimension.band)),
  )

  return candidates
    .filter((dimension) => bandSeverity(dimension.band) === topSeverity)
    .slice(0, MAX_LEAD_DIMENSIONS)
    .map(
      (dimension) => DIMENSION_HEADLINE_PHRASE[dimension.id as SkinDimensionId],
    )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const HEADLINE_TEMPLATE: Record<
  "mild" | "moderate" | "elevated",
  (phrase: string, plural: boolean) => string
> = {
  mild: (phrase) => `Mostly balanced, with ${phrase} the main thing to watch`,
  moderate: (phrase, plural) =>
    `${capitalize(phrase)} ${plural ? "stand" : "stands"} out most in this scan, worth addressing in your routine`,
  elevated: (phrase, plural) =>
    `${capitalize(phrase)} ${plural ? "are" : "is"} the clearest pattern${plural ? "s" : ""} in this scan, worth prioritizing in your routine`,
}

/**
 * Headline for the overall band, naming the dimensions behind it when they are
 * known.
 *
 * `minimal` and `not_assessed` keep their band-only copy: at minimal there is
 * no dimension worth singling out, and at not_assessed there is nothing to name.
 */
export function formatSkinHeadline(
  band: AssessmentBand,
  dimensions?: SkinDimension[],
) {
  if (band === "minimal" || band === "not_assessed" || !dimensions) {
    return SKIN_HEADLINE[band]
  }

  const phrases = selectLeadPhrases(dimensions)
  if (phrases.length === 0) {
    return SKIN_HEADLINE[band]
  }

  return HEADLINE_TEMPLATE[band](phrases.join(" and "), phrases.length > 1)
}

/** Renders a profile concern id with the same label the user picked it under. */
export function formatConcernLabel(concern: string) {
  const option = CONCERN_OPTIONS.find((item) => item.value === concern)
  return option?.label ?? concern.replaceAll("_", " ")
}

const CLIMATE_BAND_LABEL: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  extreme: "Extreme",
}

const CLIMATE_ZONE_LABEL: Record<string, string> = {
  humid_subtropical: "Humid subtropical",
  arid: "Arid",
  cold: "Cold",
  temperate_humid: "Temperate humid",
  temperate: "Temperate",
}

const SEASON_LABEL: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
}

export function formatClimateBand(band: string | null | undefined) {
  if (!band) return "—"
  return CLIMATE_BAND_LABEL[band] ?? band
}

export function formatClimateZone(zone: string | null | undefined) {
  if (!zone) return "—"
  return CLIMATE_ZONE_LABEL[zone] ?? zone.replaceAll("_", " ")
}

export function formatSeasonBand(season: string | null | undefined) {
  if (!season) return "—"
  return SEASON_LABEL[season] ?? season
}

export function formatLocationLabel(input: {
  city?: string | null
  region?: string | null
  country?: string | null
}) {
  return [input.city, input.region, input.country].filter(Boolean).join(", ")
}

const APPLICATION_TIME_LABEL: Record<ApplicationTime, string> = {
  morning: "Morning",
  evening: "Evening",
  anytime: "Anytime",
  morning_and_evening: "Morning & evening",
}

const APPLICATION_FREQUENCY_LABEL: Record<ApplicationFrequency, string> = {
  once_daily: "Once daily",
  twice_daily: "Twice daily",
  as_needed: "As needed",
  few_times_weekly: "Few times weekly",
  weekly: "Weekly",
}

export function formatApplicationTime(time: ApplicationTime) {
  return APPLICATION_TIME_LABEL[time]
}

export function formatApplicationFrequency(frequency: ApplicationFrequency) {
  return APPLICATION_FREQUENCY_LABEL[frequency]
}

export function formatApplicationSchedule(
  time: ApplicationTime | undefined,
  frequency: ApplicationFrequency | undefined,
) {
  if (!time || !frequency) return null
  return `${formatApplicationTime(time)} · ${formatApplicationFrequency(frequency)}`
}
