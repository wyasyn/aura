import { RecommendationWeightsForm } from "@/components/clinics/recommendation-weights-form"
import { loadClinicRecommendationWeights } from "@/lib/clinics/recommendation-weight-actions"

/**
 * Resolves this clinic's weights server-side.
 *
 * The loader — not the form — establishes the tenant and the permission. A
 * layout and the page beneath it render in parallel, so a gate above cannot be
 * relied on to stop this running.
 */
export async function ClinicRecommendationWeightsLoader() {
  const state = await loadClinicRecommendationWeights()
  return <RecommendationWeightsForm initial={state} />
}
