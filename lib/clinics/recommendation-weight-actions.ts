"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@/generated/prisma/client"
import { recordAudit } from "@/lib/audit/log"
import { requireClinicMember } from "@/lib/clinics/membership"
import { requirePermission } from "@/lib/clinics/permissions"
import { prisma } from "@/lib/db/client"
import {
  DEFAULT_WEIGHTS,
  resolveWeights,
  scoringWeightsSchema,
  WEIGHTS_VERSION,
  type ScoringWeights,
} from "@/lib/recommendation/weights"

/**
 * Reading and writing one clinic's scoring weights.
 *
 * The tenant is resolved from the session, never accepted from the caller. A
 * clinic id in a payload would be a request to act on whichever clinic the
 * browser named, which is the whole of a cross-tenant write.
 *
 * Validation here is authoritative. The form performs the same checks for the
 * sake of the person filling it in, but a weight that would invert the engine —
 * a negative concern match ranks the least relevant product first — is refused
 * on the server whatever the client sent.
 */

export type ClinicWeightsState = {
  weights: ScoringWeights
  defaults: ScoringWeights
  /** False when this clinic has never tuned and is running Aurora's defaults. */
  customised: boolean
  version: string
  canConfigure: boolean
  updatedAt: string | null
}

export type SaveWeightsResult =
  | { ok: true; weights: ScoringWeights }
  | { ok: false; error: string }

export async function loadClinicRecommendationWeights(): Promise<ClinicWeightsState> {
  const session = await requireClinicMember()
  requirePermission(session, "RECOMMENDATION_VIEW")

  const settings = await prisma.clinicSettings.findUnique({
    where: { id: session.tenant.clinicId },
    select: { recommendationWeights: true, updatedAt: true },
  })

  const stored = settings?.recommendationWeights ?? null
  const weights = resolveWeights(stored)

  return {
    weights,
    defaults: DEFAULT_WEIGHTS,
    // A stored row that resolves to the defaults tuned nothing, either because
    // it was empty or because every value was refused.
    customised:
      stored !== null && JSON.stringify(weights) !== JSON.stringify(DEFAULT_WEIGHTS),
    version: WEIGHTS_VERSION,
    canConfigure: session.permissions.includes("RECOMMENDATION_CONFIGURE"),
    updatedAt: stored !== null ? (settings?.updatedAt.toISOString() ?? null) : null,
  }
}

export async function saveClinicRecommendationWeights(
  input: unknown,
): Promise<SaveWeightsResult> {
  const session = await requireClinicMember()
  // Throws rather than returning a value: an ordinary member reaching this has
  // bypassed a disabled form, and the answer to that is a refusal, not a
  // successful-looking response that quietly changed nothing.
  requirePermission(session, "RECOMMENDATION_CONFIGURE")

  const parsed = scoringWeightsSchema.safeParse(input)
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") ?? "weights"
    return { ok: false, error: `${field} is outside the allowed range.` }
  }

  const previous = await prisma.clinicSettings.findUnique({
    where: { id: session.tenant.clinicId },
    select: { recommendationWeights: true },
  })

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: { recommendationWeights: parsed.data },
  })

  await recordAudit({
    action: "tenant.recommendation_weights_changed",
    subjectType: "clinic",
    subjectId: session.tenant.organizationId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    result: "success",
    // Both sides recorded. Weights are numbers describing how advice is
    // scored, not secrets, and "what did it used to be" is the question an
    // audit of a configuration change exists to answer.
    metadata: {
      weightsVersion: WEIGHTS_VERSION,
      previous: previous?.recommendationWeights ?? null,
      next: parsed.data,
    },
  })

  revalidatePath("/clinic/recommendations")
  return { ok: true, weights: parsed.data }
}

/**
 * Restores Aurora's defaults.
 *
 * Clears the stored row rather than writing a copy of the defaults into it.
 * There is one authoritative default configuration; a clinic holding its own
 * copy would keep yesterday's numbers when the platform's change.
 */
export async function resetClinicRecommendationWeights(): Promise<SaveWeightsResult> {
  const session = await requireClinicMember()
  requirePermission(session, "RECOMMENDATION_CONFIGURE")

  const previous = await prisma.clinicSettings.findUnique({
    where: { id: session.tenant.clinicId },
    select: { recommendationWeights: true },
  })

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    // Prisma.DbNull clears the column; a bare null would be the JSON value
    // `null`, which resolveWeights would then read as a stored configuration.
    data: { recommendationWeights: Prisma.DbNull },
  })

  await recordAudit({
    action: "tenant.recommendation_weights_changed",
    subjectType: "clinic",
    subjectId: session.tenant.organizationId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    result: "success",
    metadata: {
      weightsVersion: WEIGHTS_VERSION,
      previous: previous?.recommendationWeights ?? null,
      next: null,
      reset: true,
    },
  })

  revalidatePath("/clinic/recommendations")
  return { ok: true, weights: DEFAULT_WEIGHTS }
}
