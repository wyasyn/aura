import { prisma } from "@/lib/db/client"
import type { CatalogueScope } from "@/lib/products/catalogue-scope"
import { DEFAULT_WEIGHTS, resolveWeights, type ScoringWeights } from "@/lib/recommendation/weights"

/**
 * The scoring weights in force for a request.
 *
 * A clinic's own weights when it has tuned them, Aurora's defaults otherwise.
 * The scope is passed in rather than read from a global here, so this cannot be
 * called without the caller having established which tenant it is acting for —
 * a weights lookup that resolved its own tenant would be a second place for
 * tenant resolution to be got wrong.
 */

export type ResolvedWeights = {
  weights: ScoringWeights
  /** Whether a clinic's own row supplied them. Recorded on the run. */
  usedClinicWeights: boolean
}

export async function weightsForScope(
  scope: CatalogueScope,
): Promise<ResolvedWeights> {
  if (!scope) {
    return { weights: DEFAULT_WEIGHTS, usedClinicWeights: false }
  }

  const settings = await prisma.clinicSettings.findUnique({
    where: { organizationId: scope },
    select: { recommendationWeights: true },
  })

  const stored = settings?.recommendationWeights
  if (stored === null || stored === undefined) {
    return { weights: DEFAULT_WEIGHTS, usedClinicWeights: false }
  }

  const weights = resolveWeights(stored)

  // A stored row that resolves to the defaults did not tune anything — either
  // it was empty or every value was refused. Recording it as clinic weights
  // would make the analytics claim a clinic influenced a ranking it did not.
  const tuned = JSON.stringify(weights) !== JSON.stringify(DEFAULT_WEIGHTS)

  return { weights, usedClinicWeights: tuned }
}
