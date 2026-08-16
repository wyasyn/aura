import { recallScanHistoryContext } from "@/lib/ai/context/memory-snapshot"
import type { ScanHistoryContextItem } from "@/lib/ai/types"

export function resolveScanHistoryFallback(
  userId: string,
  excludeScanId: string,
  limit: number,
): ScanHistoryContextItem[] {
  return recallScanHistoryContext(userId, excludeScanId, limit) ?? []
}
