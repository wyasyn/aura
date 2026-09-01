import { revalidateTag } from "next/cache"

export const CATALOG_CONTEXT_TAG = "catalog-context"

const USER_SCAN_CONTEXT_PREFIX = "user-scan-context"
const SCAN_HISTORY_CONTEXT_PREFIX = "scan-history-context"

/**
 * Safety TTL when tag revalidation is missed (seconds).
 *
 * One minute rather than an hour, because tag revalidation is only reliable
 * within a single process. On Vercel the platform shares the cache; self-hosted
 * across two or more container instances it does not, so a product edit
 * revalidates the instance that served the edit and no other. This bounds how
 * long the others can disagree.
 *
 * The cost is a single indexed findMany per minute per instance, which is
 * cheap next to a clinic adding a product, not seeing it recommended, and
 * adding it again. It is a mitigation, not a fix — see docs/aws-deployment.md
 * for why the deployment runs one instance until a shared cache handler exists.
 */
export const CATALOG_CACHE_REVALIDATE_SECONDS = 60
export const USER_SCAN_CONTEXT_REVALIDATE_SECONDS = 300
export const SCAN_HISTORY_CACHE_REVALIDATE_SECONDS = 300

export function userScanContextTag(userId: string): string {
  return `${USER_SCAN_CONTEXT_PREFIX}:${userId}`
}

export function scanHistoryContextTag(userId: string): string {
  return `${SCAN_HISTORY_CONTEXT_PREFIX}:${userId}`
}

/**
 * The cache key for one clinic's slice of the catalogue.
 *
 * The global catalogue is cached under one tag because every tenant sees the
 * same rows. A clinic's own products are not the same for everyone, so they get
 * a tag of their own — without this, the first tenant to warm the cache would
 * serve its private catalogue to every other tenant, silently and until the TTL
 * expired.
 */
export function tenantCatalogContextTag(organizationId: string): string {
  return `${CATALOG_CONTEXT_TAG}:${organizationId}`
}

/** Invalidates the Aurora catalogue. Does not touch any clinic's own. */
export function revalidateCatalogContext(): void {
  revalidateTag(CATALOG_CONTEXT_TAG, "max")
}

/** Invalidates one clinic's catalogue. Does not touch Aurora's or anyone else's. */
export function revalidateTenantCatalogContext(organizationId: string): void {
  revalidateTag(tenantCatalogContextTag(organizationId), "max")
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
