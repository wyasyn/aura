import type { AnimatedBadgeStatus } from "@/components/motion/animated-badge"
import type { AssessmentBand } from "@/lib/scan/types"

const BAND_CHIP_CLASS: Record<AssessmentBand, string> = {
  minimal: "border-chart-1/30 bg-chart-1/10 text-chart-1",
  mild: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  moderate: "border-chart-3/30 bg-chart-3/10 text-chart-3",
  elevated: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  not_assessed: "border-border bg-muted/50 text-muted-foreground",
}

const BAND_CARD_ACCENT_CLASS: Record<AssessmentBand, string> = {
  minimal: "border-l-chart-1",
  mild: "border-l-chart-2",
  moderate: "border-l-chart-3",
  elevated: "border-l-chart-4",
  not_assessed: "border-l-muted-foreground/40",
}

const BAND_ANIMATED_STATUS: Record<AssessmentBand, AnimatedBadgeStatus> = {
  minimal: "success",
  mild: "success",
  moderate: "warning",
  elevated: "danger",
  not_assessed: "neutral",
}

/** PDF hex colors aligned with in-app chart band scale (minimal → elevated). */
const BAND_PDF_COLOR: Record<AssessmentBand, string> = {
  minimal: "#5a8f4a",
  mild: "#8b6914",
  moderate: "#b8860b",
  elevated: "#a85c32",
  not_assessed: "#888888",
}

export function getBandChipClass(band: AssessmentBand) {
  return BAND_CHIP_CLASS[band]
}

export function getBandCardAccentClass(band: AssessmentBand) {
  return BAND_CARD_ACCENT_CLASS[band]
}

export function getBandAnimatedStatus(band: AssessmentBand) {
  return BAND_ANIMATED_STATUS[band]
}

export function getBandPdfColor(band: AssessmentBand) {
  return BAND_PDF_COLOR[band]
}
