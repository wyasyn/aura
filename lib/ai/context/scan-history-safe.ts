import {
  getUserScanHistoryContext,
  CHAT_SCAN_HISTORY_LIMIT,
  type GetUserScanHistoryOptions,
} from "@/lib/ai/context/scan-history"
import { resolveScanHistoryFallback } from "@/lib/ai/context/scan-history-fallback"
import type { ScanHistoryContextItem } from "@/lib/ai/types"

export async function getUserScanHistoryContextSafe(
  userId: string,
  options: GetUserScanHistoryOptions = {},
): Promise<ScanHistoryContextItem[]> {
  const limit = options.limit ?? CHAT_SCAN_HISTORY_LIMIT
  const excludeScanId = options.excludeScanId ?? ""

  try {
    return await getUserScanHistoryContext(userId, options)
  } catch (error) {
    const snapshot = resolveScanHistoryFallback(userId, excludeScanId, limit)
    if (snapshot.length > 0) {
      console.warn(
        "[ai-context] using in-memory scan history snapshot after DB failure",
      )
      return snapshot
    }

    console.warn(
      "[ai-context] scan history unavailable; continuing without prior scans",
      error,
    )
    return []
  }
}
