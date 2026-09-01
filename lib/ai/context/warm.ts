import { cache } from "react"

import { getCatalogContext } from "@/lib/ai/context/catalog"
import {
  getUserScanHistoryContext,
  SCAN_ANALYSIS_HISTORY_LIMIT,
} from "@/lib/ai/context/scan-history"
import { getUserScanContext } from "@/lib/ai/context/user"
import { withDbWarmupRetry } from "@/lib/db/retry"

export { SCAN_ANALYSIS_HISTORY_LIMIT }

const WARMUP_TIMEOUT_MS = 5_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function warmAiScanContextUncached(userId: string): Promise<void> {
  const work = Promise.all([
    withDbWarmupRetry(() => getCatalogContext()),
    withDbWarmupRetry(() => getUserScanContext(userId)),
    withDbWarmupRetry(() =>
      getUserScanHistoryContext(userId, {
        limit: SCAN_ANALYSIS_HISTORY_LIMIT,
      }),
    ),
  ])

  await Promise.race([
    work,
    sleep(WARMUP_TIMEOUT_MS).then(() => {
      throw new Error("ai-context warmup timed out")
    }),
  ])
}

export const warmAiScanContext = cache(async (userId: string): Promise<void> => {
  try {
    await warmAiScanContextUncached(userId)
  } catch (error) {
    console.warn("[ai-context] warmup failed after retries", error)
  }
})

/** Fire-and-forget preload — never block route rendering on DB warmup. */
export function scheduleAiScanContextWarmup(userId: string): void {
  void warmAiScanContext(userId)
}
