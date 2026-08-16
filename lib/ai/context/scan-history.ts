import { unstable_cache } from "next/cache"
import { cache } from "react"

import {
  SCAN_HISTORY_CACHE_REVALIDATE_SECONDS,
  scanHistoryContextTag,
} from "@/lib/ai/context/cache-tags"
import {
  rememberScanHistoryContext,
} from "@/lib/ai/context/memory-snapshot"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import type { ScanHistoryContextItem } from "@/lib/ai/types"
import type {
  NaturalRecommendation,
  ProductRecommendation,
  SkinDimension,
} from "@/lib/scan/types"

export const SCAN_ANALYSIS_HISTORY_LIMIT = 3
export const CHAT_SCAN_HISTORY_LIMIT = SCAN_ANALYSIS_HISTORY_LIMIT

type GetUserScanHistoryOptions = {
  excludeScanId?: string
  limit?: number
}

export type { GetUserScanHistoryOptions }

function compactDimensions(dimensions: unknown): ScanHistoryContextItem["dimensions"] {
  if (!Array.isArray(dimensions)) return []
  return dimensions
    .filter(
      (item): item is SkinDimension =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "band" in item,
    )
    .map((item) => ({
      id: String(item.id),
      band: String(item.band),
    }))
}

function compactNaturalRecommendations(
  items: unknown,
): ScanHistoryContextItem["naturalRecommendations"] {
  if (!Array.isArray(items)) return []
  return items
    .filter(
      (item): item is NaturalRecommendation =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "description" in item,
    )
    .map((item) => ({
      title: item.title,
      description: item.description,
    }))
}

function compactProductRecommendations(
  items: unknown,
): ScanHistoryContextItem["recommendations"] {
  if (!Array.isArray(items)) return []
  return items
    .filter(
      (item): item is ProductRecommendation =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item &&
        "reason" in item,
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      reason: item.reason,
    }))
}

async function fetchUserScanHistoryContext(
  userId: string,
  excludeScanId: string,
  limit: number,
): Promise<ScanHistoryContextItem[]> {
  const scans = await withDbRetry(() =>
    prisma.scan.findMany({
      where: {
        userId,
        status: "completed",
        result: { isNot: null },
        ...(excludeScanId ? { id: { not: excludeScanId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        result: {
          select: {
            overallBand: true,
            summary: true,
            dimensions: true,
            naturalRecommendations: true,
            recommendations: true,
          },
        },
      },
    }),
  )

  const history = scans.map((scan) => ({
    scanId: scan.id,
    createdAt: scan.createdAt.toISOString(),
    overallBand: scan.result!.overallBand,
    summary: scan.result!.summary ?? "",
    dimensions: compactDimensions(scan.result!.dimensions),
    naturalRecommendations: compactNaturalRecommendations(
      scan.result!.naturalRecommendations,
    ),
    recommendations: compactProductRecommendations(
      scan.result!.recommendations,
    ),
  }))

  rememberScanHistoryContext(userId, excludeScanId, limit, history)
  return history
}

export const getUserScanHistoryContext = cache(
  async (
    userId: string,
    options: GetUserScanHistoryOptions = {},
  ): Promise<ScanHistoryContextItem[]> => {
    const limit = options.limit ?? CHAT_SCAN_HISTORY_LIMIT
    const excludeScanId = options.excludeScanId ?? ""

    return unstable_cache(
      () => fetchUserScanHistoryContext(userId, excludeScanId, limit),
      ["scan-history-context", userId, excludeScanId, String(limit)],
      {
        tags: [scanHistoryContextTag(userId)],
        revalidate: SCAN_HISTORY_CACHE_REVALIDATE_SECONDS,
      },
    )()
  },
)
