import { revalidateTag } from "next/cache"

export const CATALOG_CONTEXT_TAG = "catalog-context"

const USER_SCAN_CONTEXT_PREFIX = "user-scan-context"
const SCAN_HISTORY_CONTEXT_PREFIX = "scan-history-context"

/** Safety TTL when tag revalidation is missed (seconds). */
export const CATALOG_CACHE_REVALIDATE_SECONDS = 3600
export const USER_SCAN_CONTEXT_REVALIDATE_SECONDS = 300
export const SCAN_HISTORY_CACHE_REVALIDATE_SECONDS = 300

export function userScanContextTag(userId: string): string {
  return `${USER_SCAN_CONTEXT_PREFIX}:${userId}`
}

export function scanHistoryContextTag(userId: string): string {
  return `${SCAN_HISTORY_CONTEXT_PREFIX}:${userId}`
}

export function revalidateCatalogContext(): void {
  revalidateTag(CATALOG_CONTEXT_TAG, "max")
}

export function revalidateUserScanContext(userId: string): void {
  revalidateTag(userScanContextTag(userId), "max")
}

export function revalidateScanHistoryContext(userId: string): void {
  revalidateTag(scanHistoryContextTag(userId), "max")
}

export function revalidateAiUserContext(userId: string): void {
  revalidateUserScanContext(userId)
  revalidateScanHistoryContext(userId)
}
