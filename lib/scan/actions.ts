"use server"

import type { Prisma } from "@/generated/prisma/client"
import { revalidatePath } from "next/cache"

import { recordAiUsage } from "@/lib/ai/usage/record-usage"
import { toLocationSnapshot } from "@/lib/climate/context"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import {
  filterCatalogRecommendations,
  getActiveCatalogSlugs,
} from "@/lib/products/validate-catalog-recommendations"
import { CONSENT_VERSION } from "@/lib/onboarding/constants"
import { REPORT_FORMAT_VERSION } from "@/lib/scan/constants"
import { toScanResultData } from "@/lib/scan/persist"
import { saveScanResultSchema } from "@/lib/scan/schemas"
import type { SkinAssessment } from "@/lib/scan/types"
import { DEFAULT_MOCK_USAGE } from "@/lib/scans/constants"
import { getTenantOrganizationIdSafe } from "@/lib/clinics/tenant"
import { getScansRemaining, debitScanInTransaction } from "@/lib/scans/balance"
import { estimateScanProviderCost } from "@/lib/scans/cost"
import type { UsageInput } from "@/lib/scans/cost"
import { getUsageTotalTokens } from "@/lib/tokens/format-usage"
import type { z } from "zod"

type SaveScanResultInput = z.input<typeof saveScanResultSchema> | SkinAssessment

type SaveScanResult =
  | { ok: true; scanId: string; reportId: string }
  | { ok: false; error: string }

function hasMeteredUsage(usage: UsageInput): boolean {
  return (
    usage.inputTokens > 0 ||
    usage.outputTokens > 0 ||
    (usage.cachedTokens ?? 0) > 0
  )
}

/** @deprecated Prefer analyzeScanAction for new scan flow. */
export async function saveScanResultAction(
  input: SaveScanResultInput,
): Promise<SaveScanResult> {
  const session = await requireSession()
  const parsed = saveScanResultSchema.parse(
    typeof input === "object" && input !== null && "assessment" in input
      ? input
      : { assessment: input },
  )
  const assessment = parsed.assessment
  const catalogSlugs = await getActiveCatalogSlugs()
  const validatedAssessment = {
    ...assessment,
    recommendations: filterCatalogRecommendations(
      assessment.recommendations,
      catalogSlugs,
    ),
  }
  const resultData = toScanResultData(validatedAssessment)
  const usage: UsageInput = parsed.usage ?? DEFAULT_MOCK_USAGE

  const remaining = await getScansRemaining(session.user.id)
  if (remaining < 1) {
    return { ok: false, error: "No scans remaining" }
  }

  const costEstimate = await estimateScanProviderCost(usage)

  // A scan taken on a clinic's subdomain belongs to that clinic.
  const organizationId = await getTenantOrganizationIdSafe()

  const [profile, location] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.userLocation.findUnique({ where: { userId: session.user.id } }),
  ])

  try {
    const scan = await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        const created = await tx.scan.create({
          data: {
            userId: session.user.id,
            organizationId,
            status: "completed",
            imageRetained: false,
            profileSnapshot: profile
              ? {
                  ageBand: profile.ageBand,
                  skinType: profile.skinType,
                  fitzpatrickBand: profile.fitzpatrickBand,
                  primaryConcerns: profile.primaryConcerns,
                  skinGoals: profile.skinGoals,
                }
              : undefined,
            locationSnapshot: toLocationSnapshot(location),
            consentSnapshot: profile
              ? {
                  consentVersion: profile.consentVersion ?? CONSENT_VERSION,
                  photoProcessingConsent: profile.photoProcessingConsent,
                  consentAcceptedAt: profile.consentAcceptedAt,
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

        if (hasMeteredUsage(usage)) {
          const totalTokens = getUsageTotalTokens(usage)

          await tx.scanUsage.create({
            data: {
              scanId: created.id,
              provider: usage.provider,
              modelId: usage.modelId,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              cachedTokens: usage.cachedTokens ?? 0,
              reasoningTokens: usage.reasoningTokens ?? null,
              totalTokens,
              estimatedCostMicros: costEstimate?.costMicros ?? null,
              rawUsage: (usage.rawUsage ?? undefined) as
                | Prisma.InputJsonValue
                | undefined,
            },
          })
        }

        await debitScanInTransaction(tx, {
          userId: session.user.id,
          reason: "scan_debit",
          scanId: created.id,
          metadata: {
            modelId: usage.modelId,
            estimatedCostMicros: costEstimate?.costMicros ?? null,
          },
        })

        return { scan: created, report }
      }),
    )

    if (hasMeteredUsage(usage)) {
      await recordAiUsage({
        feature: "scan_analyze",
        usage,
        userId: session.user.id,
        scanId: scan.scan.id,
        costMicros: costEstimate?.costMicros ?? null,
        marginMicros: costEstimate?.marginMicros ?? null,
      })
    }

    revalidatePath("/reports")
    revalidatePath("/dashboard")

    return {
      ok: true,
      scanId: scan.scan.id,
      reportId: scan.report.id,
    }
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "Insufficient scan balance"
    ) {
      return { ok: false, error: "No scans remaining" }
    }
    return { ok: false, error: "Could not save scan result" }
  }
}
