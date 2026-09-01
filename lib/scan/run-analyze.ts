import { analyzeSkin } from "@/lib/ai/adapter"
import {
  ensureClimateForScan,
  toScanClimateContext,
} from "@/lib/climate/context"
import { prisma } from "@/lib/db/client"
import { getScanModelForTier, getUserScanTier } from "@/lib/models/queries"
import { enrichRecommendationsWithImages } from "@/lib/products/enrich-recommendations"
import { selectGapFills } from "@/lib/recommendation/gap-fill"
import { recommendForScan } from "@/lib/recommendation/recommend"
import {
  logScanAnalysisError,
  toUserFacingScanError,
} from "@/lib/scan/errors"
import { persistScanResult } from "@/lib/scan/persist-scan-result"
import type { AnalyzeScanResult } from "@/lib/scan/types"
import { getScansRemaining } from "@/lib/scans/balance"
import { estimateScanProviderCost } from "@/lib/scans/cost"

type RunAnalyzeScanInput = {
  userId: string
  image: Buffer
  mimeType: "image/jpeg" | "image/png" | "image/webp"
}

export async function runAnalyzeScan(
  input: RunAnalyzeScanInput,
): Promise<AnalyzeScanResult> {
  const tier = await getUserScanTier(input.userId)
  const activeModel = await getScanModelForTier(tier)
  if (!activeModel) {
    return {
      ok: false,
      error: toUserFacingScanError(
        new Error(`No active scan model configured for ${tier} tier`),
      ),
    }
  }

  const remaining = await getScansRemaining(input.userId)
  if (remaining < 1) {
    return {
      ok: false,
      error: toUserFacingScanError(new Error("No scans remaining")),
    }
  }

  const location = await ensureClimateForScan(input.userId)
  const climateContext = toScanClimateContext(location)

  let analysis
  try {
    analysis = await analyzeSkin({
      userId: input.userId,
      image: input.image,
      mimeType: input.mimeType,
      model: {
        provider: activeModel.provider,
        modelId: activeModel.modelId,
        displayName: activeModel.displayName,
        thinkingLevel: activeModel.thinkingLevel,
      },
    })
  } catch (err) {
    logScanAnalysisError("analysis", err)
    return { ok: false, error: toUserFacingScanError(err) }
  }

  const costEstimate = await estimateScanProviderCost(analysis.usage)

  const profile = await prisma.userProfile.findUnique({
    where: { userId: input.userId },
  })

  // Aurora decides which products; the model that just read the photograph does
  // not. Its own selection is kept only to fill slots the engine could not,
  // and every such fill is recorded on the run.
  const engine = await recommendForScan({
    assessment: analysis.assessment,
    profile,
    location,
    modelId: activeModel.modelId,
  })

  const gapFilled = engine.gapFillReason
    ? await selectGapFills({
        modelRecommendations: analysis.assessment.recommendations,
        alreadySelected: engine.recommendations,
        needed: engine.gapFillCount,
        allergies: profile?.allergies ?? null,
      })
    : []

  const allergySafeRecommendations = [...engine.recommendations, ...gapFilled]

  const enrichedAssessment = {
    ...analysis.assessment,
    recommendations: await enrichRecommendationsWithImages(
      allergySafeRecommendations,
    ),
  }

  try {
    const saved = await persistScanResult({
      userId: input.userId,
      assessment: enrichedAssessment,
      usage: analysis.usage,
      estimatedCostMicros: costEstimate?.costMicros ?? null,
      marginMicros: costEstimate?.marginMicros ?? null,
      latencyMs: analysis.latencyMs,
      captureMode: "still",
      location,
      profile,
      engine: {
        result: engine.result,
        candidateCount: engine.candidateCount,
        usedClinicWeights: engine.usedClinicWeights,
        gapFillReason: engine.gapFillReason,
        gapFilled: gapFilled.map((item) => ({
          productSlug: item.id,
          productName: item.name,
          source: item.source ?? "aurora",
        })),
      },
    })

    return {
      ok: true,
      assessment: enrichedAssessment,
      scanId: saved.scan.id,
      reportId: saved.report.id,
      scansDebited: 1,
      climateContext,
    }
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "Insufficient scan balance"
    ) {
      return {
        ok: false,
        error: toUserFacingScanError(new Error("No scans remaining")),
      }
    }
    logScanAnalysisError("persist", err)
    return {
      ok: false,
      error: toUserFacingScanError(new Error("Could not save scan result")),
    }
  }
}
