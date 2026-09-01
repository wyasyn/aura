import type { SkinDosha } from "@/lib/scan/dosha"
import type { SkinDimensionId } from "@/lib/scan/dimensions"

export type AssessmentBand =
  | "minimal"
  | "mild"
  | "moderate"
  | "elevated"
  | "not_assessed"

export type ScanWizardStep =
  | "capture"
  | "edit"
  | "quality"
  | "analyzing"
  | "results"

export type CaptureMode = "upload" | "camera" | "live" | "advice"

export type ScanTier = "starter" | "plus" | "pro"

/** Token counters reported by the client-side Gemini Live session. */
export type LiveSessionUsage = {
  promptTokenCount: number
  responseTokenCount: number
  totalTokenCount: number
}

export type LiveScanPayload = {
  transcript: string
  sessionDurationMs: number
  sessionUsage?: LiveSessionUsage | null
}

export type LightingBand = "too_dark" | "ok" | "too_bright"

/**
 * What the crop actually contains: a detected face, a close-up patch of skin
 * with no face in frame, or neither.
 */
export type CropSubject = "face" | "skin" | "none"

export type QualityCheckResult = {
  faceDetected: boolean
  faceCount: number
  faceCentered: boolean
  lightingScore: number
  lightingBand: LightingBand
  skinCoverage: number
  skinDetail: number
  cropSubject: CropSubject
  isPlausibleSkin: boolean
  issues: string[]
  passed: boolean
}

export type SkinDimension = {
  id: SkinDimensionId | string
  label: string
  band: AssessmentBand
  note: string
}

export type DoshaTyping = {
  primary: SkinDosha
  secondary?: SkinDosha | null
  note: string
}

export type ApplicationTime =
  | "morning"
  | "evening"
  | "anytime"
  | "morning_and_evening"

export type ApplicationFrequency =
  | "once_daily"
  | "twice_daily"
  | "as_needed"
  | "few_times_weekly"
  | "weekly"

export type NaturalRecommendation = {
  id: string
  title: string
  description: string
  applicationTime?: ApplicationTime
  applicationFrequency?: ApplicationFrequency
}

export type ProductRecommendation = {
  id: string
  name: string
  reason: string
  applicationTime?: ApplicationTime
  applicationFrequency?: ApplicationFrequency
  imageUrl?: string | null
  storeUrl?: string | null
  /**
   * Which catalogue the product came from, so the patient can see whether
   * their clinic stocks it or Aurora does. Resolved server-side from the
   * product row; the organization id itself is never sent to the client.
   */
  source?: "aurora" | "clinic"
  /** Structured product metadata, e.g. organic or ayurvedic. */
  classifications?: string[]
}

/**
 * A stated concern the photo does not support, kept out of the summary.
 *
 * The summary used to have to acknowledge every stated concern inline, which
 * appended a bookkeeping clause per concern and buried the actual findings.
 * Concerns with nothing visible behind them land here instead.
 */
export type ConcernNotVisible = {
  /** The profile concern id, e.g. "dryness". */
  concern: string
  /** One sentence on what the photo shows for it instead. */
  note: string
}

export type SkinAssessment = {
  overallBand: AssessmentBand
  dimensions: SkinDimension[]
  doshaTyping: DoshaTyping
  summary: string
  concernsNotVisible: ConcernNotVisible[]
  naturalRecommendations: NaturalRecommendation[]
  recommendations: ProductRecommendation[]
  disclaimer: string
}

export type ScanClimateContext = {
  city: string | null
  region: string | null
  country: string | null
  uvIndexBand: string | null
  humidityBand: string | null
  temperatureBand: string | null
  climateZone: string | null
  seasonBand: string | null
  syncedAt: string | null
}

export type AnalyzeScanResult =
  | {
      ok: true
      assessment: SkinAssessment
      scanId: string
      reportId: string
      scansDebited: 1
      climateContext: ScanClimateContext | null
    }
  | { ok: false; error: string }

export type AnalysisToolCallStatus = "pending" | "running" | "done" | "error"

export type AnalysisToolCall = {
  id: string
  name: string
  label: string
  status: AnalysisToolCallStatus
  detail?: string
}

export type FaceDetection = {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export type CropArea = {
  x: number
  y: number
  width: number
  height: number
}
