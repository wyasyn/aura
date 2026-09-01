/**
 * De-identification for the training pipeline.
 *
 * Built as a strict allowlist: the payload is assembled by naming every field
 * that may leave, never by spreading a scan or its result. A field added to
 * Scan later therefore cannot leak into training data by default — someone has
 * to come here and decide to include it. The opposite shape, a denylist, fails
 * silently the moment the schema grows.
 *
 * What is deliberately excluded, and why:
 *
 *   - Names, emails, user and scan ids. Direct identifiers.
 *   - City and region. A city plus a skin condition plus a date can identify
 *     one person in a small population; country is the finest granularity kept.
 *   - Exact timestamps, coarsened to year-month, for the same reason.
 *   - Free text: the model's summary, its recommendations, and any patient
 *     feedback message. Generated prose can restate specifics a patient typed,
 *     and none of it is needed to learn from a structured assessment.
 *   - Consent snapshots. Provenance, not training signal.
 */

/** Bumped whenever the rules below change, and stored on every record. */
export const DEIDENT_VERSION = "1"

/** Plain JSON, which is all a payload may contain. */
export type JsonSafe =
  | string
  | number
  | boolean
  | null
  | JsonSafe[]
  | { [key: string]: JsonSafe }

/**
 * Round-trips a value through JSON so the payload holds nothing but plain data.
 * Drops undefined, functions and class instances, and detaches the value from
 * whatever object the database handed back.
 */
function jsonSafe(value: unknown): JsonSafe {
  if (value === undefined || value === null) return null
  try {
    return JSON.parse(JSON.stringify(value)) as JsonSafe
  } catch {
    return null
  }
}

export type TrainingPayload = {
  profile: {
    ageBand: string | null
    skinType: string | null
    fitzpatrickBand: string | null
    skinDosha: string | null
    primaryConcerns: string[]
    skinGoals: string[]
  }
  environment: {
    country: string | null
    climateZone: string | null
    seasonBand: string | null
    uvIndexBand: string | null
    humidityBand: string | null
    temperatureBand: string | null
  }
  assessment: {
    overallBand: string
    dimensions: JsonSafe
    doshaTyping: JsonSafe
  }
  context: {
    captureMode: string
    /** Year and month only, e.g. "2026-08". */
    scanMonth: string
    /** Numeric rating if the patient left one; their message is never included. */
    patientRating: number | null
  }
}

/**
 * Accepts whatever the database hands back — Prisma's JsonValue, enums, dates.
 * Everything is narrowed or normalised on the way out, so the input side stays
 * deliberately loose and the output side stays strict.
 */
type ScanForDeident = {
  createdAt: Date
  captureMode: string
  profileSnapshot: unknown
  locationSnapshot: unknown
  result: {
    overallBand: string
    dimensions: unknown
    doshaTyping: unknown
  } | null
  feedback: { rating: number } | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

/** Only strings survive, so a nested object cannot ride along inside an array. */
function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function yearMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export type DeidentResult =
  | { ok: true; payload: TrainingPayload; version: string }
  /** No assessment means nothing to learn from. */
  | { ok: false; reason: "no_result" }

export function deidentifyScan(scan: ScanForDeident): DeidentResult {
  if (!scan.result) return { ok: false, reason: "no_result" }

  const profile = asRecord(scan.profileSnapshot)
  const location = asRecord(scan.locationSnapshot)

  return {
    ok: true,
    version: DEIDENT_VERSION,
    payload: {
      profile: {
        ageBand: str(profile.ageBand),
        skinType: str(profile.skinType),
        fitzpatrickBand: str(profile.fitzpatrickBand),
        skinDosha: str(profile.skinDosha),
        primaryConcerns: strArray(profile.primaryConcerns),
        skinGoals: strArray(profile.skinGoals),
      },
      environment: {
        // city and region are intentionally absent.
        country: str(location.country),
        climateZone: str(location.climateZone),
        seasonBand: str(location.seasonBand),
        uvIndexBand: str(location.uvIndexBand),
        humidityBand: str(location.humidityBand),
        temperatureBand: str(location.temperatureBand),
      },
      assessment: {
        overallBand: scan.result.overallBand,
        dimensions: jsonSafe(scan.result.dimensions),
        doshaTyping: jsonSafe(scan.result.doshaTyping),
      },
      context: {
        captureMode: scan.captureMode,
        scanMonth: yearMonth(scan.createdAt),
        patientRating: scan.feedback?.rating ?? null,
      },
    },
  }
}

/**
 * Last line of defence before a payload is stored or exported.
 *
 * Scans the serialised payload for anything that looks like a direct
 * identifier. The allowlist above should make this impossible, which is the
 * point: if this ever fires, the allowlist has a hole and the record must not
 * be written.
 */
export function findIdentifierLeaks(payload: unknown): string[] {
  const serialised = JSON.stringify(payload ?? {})
  const leaks: string[] = []

  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(serialised)) leaks.push("email address")
  // cuid and uuid shapes, which would tie a payload back to a row.
  if (/\bc[a-z0-9]{24}\b/.test(serialised)) leaks.push("cuid")
  if (
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(serialised)
  ) {
    leaks.push("uuid")
  }
  // A full ISO timestamp is finer than the year-month we allow.
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(serialised)) leaks.push("exact timestamp")

  const forbiddenKeys = ["name", "email", "city", "region", "summary", "message"]
  for (const key of forbiddenKeys) {
    if (new RegExp(`"${key}"\\s*:`).test(serialised)) leaks.push(`"${key}" field`)
  }

  return leaks
}
