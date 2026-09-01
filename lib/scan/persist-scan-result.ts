import type { Prisma } from "@/generated/prisma/client"
import { revalidatePath } from "next/cache"

import { revalidateScanHistoryContext } from "@/lib/ai/context/cache-tags"
import { recordAiUsage } from "@/lib/ai/usage/record-usage"
import { recordAudit } from "@/lib/audit/log"
import { getTenantOrganizationIdSafe } from "@/lib/clinics/tenant"
import type { ScanCaptureMode } from "@/generated/prisma/client"
import { CONSENT_VERSION } from "@/lib/onboarding/constants"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import { REPORT_FORMAT_VERSION } from "@/lib/scan/constants"
import { toScanResultData } from "@/lib/scan/persist"
import type { SkinAssessment } from "@/lib/scan/types"
import type { UsageInput } from "@/lib/scans/cost"
import { getUsageTotalTokens } from "@/lib/tokens/format-usage"
import { debitScanInTransaction } from "@/lib/scans/balance"
import { toLocationSnapshot } from "@/lib/climate/context"
import {
  persistRecommendations,
  type PersistInput,
} from "@/lib/recommendation/persist"
import type { UserLocation } from "@/generated/prisma/client"

type PersistScanResultInput = {
  userId: string
  assessment: SkinAssessment
  usage: UsageInput
  estimatedCostMicros: number | null
  marginMicros?: number | null
  latencyMs: number
  captureMode?: ScanCaptureMode
  location: UserLocation | null
  /// What the engine decided, so the reasoning is stored with the scan it explains.
  engine?: RecommendationRecord | null
  profile: {
    ageBand: string | null
    skinType: string | null
    fitzpatrickBand: string | null
    skinDosha: string | null
    primaryConcerns: string[]
    skinGoals: string[]
    consentVersion: string | null
    photoProcessingConsent: boolean | null
    consentAcceptedAt: Date | null
  } | null
}

function scanDebitMetadata(
  usage: UsageInput,
  estimatedCostMicros: number | null,
): Prisma.InputJsonValue {
  return {
    modelId: usage.modelId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedTokens: usage.cachedTokens ?? 0,
    reasoningTokens: usage.reasoningTokens ?? 0,
    totalTokens: getUsageTotalTokens(usage),
    estimatedCostMicros,
  }
}

export async function persistScanResult(input: PersistScanResultInput) {
  const resultData = toScanResultData(input.assessment)
  // A scan taken on a clinic's subdomain belongs to that clinic; one taken on
  // the platform host has no organization and stays purely the patient's.
  const organizationId = await getTenantOrganizationIdSafe()

  return withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      const created = await tx.scan.create({
        data: {
          userId: input.userId,
          organizationId,
          status: "completed",
          captureMode: input.captureMode ?? "still",
          imageRetained: false,
          profileSnapshot: input.profile
            ? {
                ageBand: input.profile.ageBand,
                skinType: input.profile.skinType,
                fitzpatrickBand: input.profile.fitzpatrickBand,
                skinDosha: input.profile.skinDosha,
                primaryConcerns: input.profile.primaryConcerns,
                skinGoals: input.profile.skinGoals,
              }
            : undefined,
          locationSnapshot: input.location
            ? toLocationSnapshot(input.location)
            : undefined,
          consentSnapshot: input.profile
            ? {
                consentVersion: input.profile.consentVersion ?? CONSENT_VERSION,
                photoProcessingConsent: input.profile.photoProcessingConsent,
                consentAcceptedAt: input.profile.consentAcceptedAt,
              }
            : undefined,
        },
      })

      await tx.scanResult.create({
        data: {
          scanId: created.id,
          overallBand: resultData.overallBand,
          dimensions: resultData.dimensions,
          doshaTyping: resultData.doshaTyping,
          summary: resultData.summary,
          concernsNotVisible: resultData.concernsNotVisible,
          naturalRecommendations: resultData.naturalRecommendations,
          recommendations: resultData.recommendations,
          disclaimerVersion: resultData.disclaimerVersion,
          reportFormatVersion: REPORT_FORMAT_VERSION,
        },
      })

      const report = await tx.report.create({
        data: {
          scanId: created.id,
          format: "pdf",
        },
      })

      // Inside the same transaction as the result it explains. A scan whose
      // recommendations were saved but whose reasoning was not is a scan
      // nobody can answer questions about.
      if (input.engine) {
        await persistRecommendations(tx, {
          scanId: created.id,
          ...input.engine,
        })
      }

      const totalTokens = getUsageTotalTokens(input.usage)

      if (totalTokens > 0) {
        await tx.scanUsage.create({
          data: {
            scanId: created.id,
            provider: input.usage.provider,
            modelId: input.usage.modelId,
            inputTokens: input.usage.inputTokens,
            outputTokens: input.usage.outputTokens,
            cachedTokens: input.usage.cachedTokens ?? 0,
            reasoningTokens: input.usage.reasoningTokens ?? null,
            totalTokens,
            estimatedCostMicros: input.estimatedCostMicros,
            latencyMs: input.latencyMs,
            rawUsage: (input.usage.rawUsage ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
          },
        })
      }

      await debitScanInTransaction(tx, {
        userId: input.userId,
        reason: "scan_debit",
        scanId: created.id,
        metadata: scanDebitMetadata(input.usage, input.estimatedCostMicros),
      })

      return { scan: created, report }
    }),
  ).then(async (saved) => {
    await recordAiUsage({
      feature: input.captureMode === "live" ? "scan_live" : "scan_analyze",
      usage: input.usage,
      userId: input.userId,
      scanId: saved.scan.id,
      latencyMs: input.latencyMs,
      costMicros: input.estimatedCostMicros,
      marginMicros: input.marginMicros ?? null,
    })

    // Both the person and the tenant, together. A platform administrator
    // scanning inside a clinic must leave both behind, or the trail cannot
    // answer "who did this, and on whose site". Never the assessment itself:
    // the band, the summary and the image stay out of the audit metadata.
    await recordAudit({
      action: "scan.created",
      subjectType: "scan",
      subjectId: saved.scan.id,
      actorId: input.userId,
      organizationId,
      metadata: { captureMode: input.captureMode ?? "still" },
    })

    revalidatePath("/reports")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/usage")
    revalidateScanHistoryContext(input.userId)
    return saved
  })
}

/** What the engine decided, minus the scan id the transaction supplies. */
export type RecommendationRecord = Omit<PersistInput, "scanId">
