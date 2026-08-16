import type { ScanTier } from "@/generated/prisma/client"
import { getUserScanTier } from "@/lib/models/queries"

export class ScanAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ScanAccessError"
  }
}

export async function getUserScanTierOrThrow(userId: string): Promise<ScanTier> {
  return getUserScanTier(userId)
}

export async function requireProScanTier(userId: string): Promise<void> {
  const tier = await getUserScanTier(userId)
  if (tier !== "pro") {
    throw new ScanAccessError("Live scan is available on the Pro tier only.")
  }
}
