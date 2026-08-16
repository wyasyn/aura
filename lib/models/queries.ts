import { cache } from "react"

import type { ScanTier } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export const ACTIVE_SCAN_MODEL_TAG = "active-scan-model"

export const getUserScanTier = cache(async (userId: string): Promise<ScanTier> => {
  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { scanTier: true },
    }),
  )
  return user?.scanTier ?? "starter"
})

/** Still-image scan model for a tier. Each tier has its own. */
export const getScanModelForTier = cache(async (tier: ScanTier) => {
  return withDbRetry(() =>
    prisma.aiModelRate.findFirst({
      where: {
        assignedTier: tier,
        isActive: true,
        supportsVision: true,
        supportsLive: false,
      },
    }),
  )
})

export const getLiveScanModel = cache(async () => {
  return withDbRetry(() =>
    prisma.aiModelRate.findFirst({
      where: {
        assignedTier: "pro",
        isActive: true,
        supportsLive: true,
      },
    }),
  )
})

/** @deprecated Use getScanModelForTier with getUserScanTier instead */
export const getActiveScanModel = cache(async () => {
  return withDbRetry(() =>
    prisma.aiModelRate.findFirst({
      where: {
        assignedTier: "starter",
        isActive: true,
        supportsVision: true,
      },
    }),
  )
})

export const listModelRates = cache(async () => {
  return prisma.aiModelRate.findMany({
    orderBy: [
      { assignedTier: "asc" },
      { displayName: "asc" },
      { modelId: "asc" },
    ],
  })
})
