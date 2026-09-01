import type { ScanHistoryContextItem, UserScanContext } from "@/lib/ai/types"

const SNAPSHOT_TTL_MS = 30 * 60 * 1000

type UserSnapshotEntry = {
  context: UserScanContext
  expiresAt: number
}

type HistorySnapshotEntry = {
  history: ScanHistoryContextItem[]
  expiresAt: number
}

const userSnapshots = new Map<string, UserSnapshotEntry>()
const historySnapshots = new Map<string, HistorySnapshotEntry>()

function historyKey(userId: string, excludeScanId: string, limit: number): string {
  return `${userId}:${excludeScanId}:${limit}`
}

export function rememberUserScanContext(
  userId: string,
  context: UserScanContext,
): void {
  userSnapshots.set(userId, {
    context,
    expiresAt: Date.now() + SNAPSHOT_TTL_MS,
  })
}

export function recallUserScanContext(userId: string): UserScanContext | null {
  const entry = userSnapshots.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    userSnapshots.delete(userId)
    return null
  }
  return entry.context
}

export function rememberScanHistoryContext(
  userId: string,
  excludeScanId: string,
  limit: number,
  history: ScanHistoryContextItem[],
): void {
  historySnapshots.set(historyKey(userId, excludeScanId, limit), {
    history,
    expiresAt: Date.now() + SNAPSHOT_TTL_MS,
  })
}

export function recallScanHistoryContext(
  userId: string,
  excludeScanId: string,
  limit: number,
): ScanHistoryContextItem[] | null {
  const entry = historySnapshots.get(historyKey(userId, excludeScanId, limit))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    historySnapshots.delete(historyKey(userId, excludeScanId, limit))
    return null
  }
  return entry.history
}

export function clearAiContextSnapshots(userId: string): void {
  userSnapshots.delete(userId)
  for (const key of historySnapshots.keys()) {
    if (key.startsWith(`${userId}:`)) {
      historySnapshots.delete(key)
    }
  }
}
