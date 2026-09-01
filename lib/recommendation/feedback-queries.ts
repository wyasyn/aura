import { prisma } from "@/lib/db/client"
import type { RecommendationVerdictValue } from "@/lib/recommendation/feedback-vocabulary"

export type RecommendationFeedbackState = {
  recommendationId: string
  verdict: RecommendationVerdictValue | null
}

/**
 * The feedback controls a scan's recommendations should render, by slug.
 *
 * Returns an empty map for a scan the caller does not own, and for any scan
 * predating the engine — those have no stored recommendation rows, so there is
 * nothing to attach a verdict to. The report renders without the controls
 * rather than with dead ones.
 */
export async function recommendationFeedbackState(
  scanId: string,
  userId: string,
): Promise<Map<string, RecommendationFeedbackState>> {
  const rows = await prisma.scanRecommendation.findMany({
    // Scoped through the scan's owner, so a scan id alone never reveals what
    // somebody else was recommended.
    where: { scanId, scan: { userId } },
    select: {
      id: true,
      productSlug: true,
      feedback: { select: { verdict: true } },
    },
  })

  return new Map(
    rows.map((row) => [
      row.productSlug,
      { recommendationId: row.id, verdict: row.feedback?.verdict ?? null },
    ]),
  )
}
