import type { AssessmentBand } from "@/lib/scan/types"

import { formatMicroUsd } from "@/lib/pricing/format-cost"

export { formatMicroUsd }

const BAND_SCORE: Record<AssessmentBand, number> = {
  not_assessed: 0,
  minimal: 1,
  mild: 2,
  moderate: 3,
  elevated: 4,
}

export function bandToScore(band: AssessmentBand): number {
  return BAND_SCORE[band] ?? 0
}
