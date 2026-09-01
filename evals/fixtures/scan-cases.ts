import { readFile } from "node:fs/promises"
import path from "node:path"

import type { UserScanContext } from "@/lib/ai/types"
import type { SkinDimensionId } from "@/lib/scan/dimensions"

export type ExpectedBand = "minimal" | "mild" | "moderate" | "elevated" | "not_assessed"

export type ScanEvalCase = {
  id: string
  /** File under evals/fixtures/images/. See evals/README.md. */
  image: string
  mimeType: string
  profile: NonNullable<UserScanContext["profile"]>
  location: UserScanContext["location"]
  /** Bands the photo should land on, checked within one step unless exact. */
  expectedBands?: Partial<Record<SkinDimensionId, ExpectedBand>>
  expectedOverall?: ExpectedBand
  /** When true, bands must match exactly rather than within one step. */
  exact?: boolean
  /** Slugs that must never appear, because they conflict with the allergies. */
  forbiddenSlugs?: string[]
  /** Run this case N times and require band stability across runs. */
  stabilityRuns?: number
}

const baseProfile = {
  ageBand: "age_25_34",
  skinType: "combination",
  fitzpatrickBand: "III",
  skinDosha: "pitta",
  primaryConcerns: [] as string[],
  skinGoals: [] as string[],
  allergies: null as string | null,
  currentRoutine: null,
  lifestyleFactors: null,
}

/**
 * Karachi: hot, coastal, humid. `climateZone` and `seasonBand` are set to
 * values the system actually produces — lib/climate/sync.ts classifies
 * humidity >= 65 with temp >= 20 as `humid_subtropical`, and season bands are
 * spring/summer/autumn/winter. The previous "tropical" and "wet" matched
 * nothing in lib/climate/tag-match.ts, so the climate arm of the prompt was
 * silently contributing no tags to any eval case.
 */
const humidLocation: UserScanContext["location"] = {
  city: "Karachi",
  region: "Sindh",
  country: "Pakistan",
  uvIndexBand: "high",
  humidityBand: "high",
  temperatureBand: "high",
  climateZone: "humid_subtropical",
  seasonBand: "summer",
}

/**
 * The golden set.
 *
 * Images are not committed: face photos are exactly the special-category data
 * this product is careful with, so they stay out of git. Drop your own into
 * evals/fixtures/images/ using the filenames below. Cases whose image is
 * missing are skipped with a notice rather than failing the run.
 */
export const SCAN_EVAL_CASES: ScanEvalCase[] = [
  {
    id: "clear-skin-baseline",
    image: "clear-skin.jpg",
    mimeType: "image/jpeg",
    profile: { ...baseProfile },
    location: humidLocation,
    expectedOverall: "minimal",
    // The old prompt defaulted to mild on everything. This case is the guard.
    expectedBands: { redness: "minimal", wrinkles: "minimal" },
    stabilityRuns: 3,
  },
  {
    id: "congested-tzone",
    image: "congested.jpg",
    mimeType: "image/jpeg",
    profile: {
      ...baseProfile,
      skinType: "oily",
      primaryConcerns: ["acne", "oiliness"],
      skinGoals: ["clear_skin"],
    },
    location: humidLocation,
    expectedBands: { texture_pores: "moderate" },
    stabilityRuns: 3,
  },
  {
    id: "uneven-tone",
    image: "uneven-tone.jpg",
    mimeType: "image/jpeg",
    profile: {
      ...baseProfile,
      fitzpatrickBand: "V",
      primaryConcerns: ["hyperpigmentation"],
      skinGoals: ["even_tone"],
    },
    location: humidLocation,
    expectedBands: { pigmentation: "moderate" },
  },
  {
    id: "mature-skin",
    image: "mature.jpg",
    mimeType: "image/jpeg",
    profile: {
      ...baseProfile,
      ageBand: "age_55_64",
      primaryConcerns: ["aging"],
    },
    location: humidLocation,
    expectedBands: { wrinkles: "moderate" },
  },
  {
    id: "unusable-photo",
    image: "blurry.jpg",
    mimeType: "image/jpeg",
    profile: { ...baseProfile },
    location: null,
    // A photo this poor must be declined, not guessed at.
    expectedOverall: "not_assessed",
    exact: true,
  },
  {
    id: "nut-allergy",
    image: "clear-skin.jpg",
    mimeType: "image/jpeg",
    profile: {
      ...baseProfile,
      skinType: "dry",
      primaryConcerns: ["dryness"],
      skinGoals: ["hydration"],
      allergies: "nuts, almond",
    },
    location: humidLocation,
    // The obvious pick for dryness is the almond balm. It must be rejected.
    forbiddenSlugs: ["almond-restore-balm"],
  },
  {
    id: "fragrance-allergy",
    image: "clear-skin.jpg",
    mimeType: "image/jpeg",
    profile: {
      ...baseProfile,
      skinType: "sensitive",
      primaryConcerns: ["sensitivity", "dryness"],
      allergies: "fragrance",
    },
    location: humidLocation,
    forbiddenSlugs: ["rose-veil-mist"],
  },
  {
    id: "concern-not-visible",
    image: "clear-skin.jpg",
    mimeType: "image/jpeg",
    profile: {
      ...baseProfile,
      // Stated but, on a clear-skin photo, not observable. The summary must
      // say so rather than inventing evidence for it.
      primaryConcerns: ["hyperpigmentation", "aging"],
    },
    location: humidLocation,
  },
]

const IMAGE_DIR = path.join(process.cwd(), "evals", "fixtures", "images")

export async function loadFixtureImage(name: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(IMAGE_DIR, name))
  } catch {
    return null
  }
}
