import { prisma } from "@/lib/db/client"
import { SKIN_DIMENSIONS } from "@/lib/scan/dimensions"
import type { AssessmentBand } from "@/lib/scan/types"

export type ScanTrendPoint = {
  scanId: string
  createdAt: string
  overallBand: AssessmentBand | string
  dimensions: Array<{ id: string; band: AssessmentBand | string }>
}

const BAND_ORDER: AssessmentBand[] = [
  "minimal",
  "mild",
  "moderate",
  "elevated",
  "not_assessed",
]

function bandRank(band: string): number {
  const index = BAND_ORDER.indexOf(band as AssessmentBand)
  return index === -1 ? BAND_ORDER.length : index
}

export async function getUserScanTrends(
  userId: string,
  limit = 8,
): Promise<ScanTrendPoint[]> {
  const scans = await prisma.scan.findMany({
    where: {
      userId,
      status: "completed",
      result: { isNot: null },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      result: {
        select: {
          overallBand: true,
          dimensions: true,
        },
      },
    },
  })

  return scans.map((scan) => ({
    scanId: scan.id,
    createdAt: scan.createdAt.toISOString(),
    overallBand: scan.result!.overallBand,
    dimensions: Array.isArray(scan.result!.dimensions)
      ? (scan.result!.dimensions as ScanTrendPoint["dimensions"])
      : [],
  }))
}

export function summarizeScanTrends(points: ScanTrendPoint[]) {
  if (points.length < 2) {
    return {
      hasTrend: false,
      overallDelta: 0,
      improvingDimensions: [] as string[],
      watchDimensions: [] as string[],
    }
  }

  const first = points[0]
  const last = points[points.length - 1]
  const overallDelta = bandRank(first.overallBand) - bandRank(last.overallBand)

  const improvingDimensions: string[] = []
  const watchDimensions: string[] = []

  for (const dimension of SKIN_DIMENSIONS) {
    const firstBand = first.dimensions.find((item) => item.id === dimension.id)?.band
    const lastBand = last.dimensions.find((item) => item.id === dimension.id)?.band
    if (!firstBand || !lastBand) continue

    const delta = bandRank(firstBand) - bandRank(lastBand)
    if (delta > 0) improvingDimensions.push(dimension.label)
    if (delta < 0) watchDimensions.push(dimension.label)
  }

  return {
    hasTrend: true,
    overallDelta,
    improvingDimensions,
    watchDimensions,
  }
}

export function formatScanTrendsForPrompt(points: ScanTrendPoint[]): string {
  if (points.length === 0) {
    return "No prior completed scans."
  }

  return JSON.stringify(points, null, 2)
}
