import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export const AUDIT_PAGE_SIZE = 50

export type AuditFilter = {
  /** Restrict to one tenant. Platform-wide when absent. */
  organizationId?: string | null
  action?: string | null
  result?: "success" | "denied" | "failure" | null
  cursor?: string | null
}

/**
 * Reads the audit trail for the platform control plane.
 *
 * Deliberately not tenant-scoped in the TenantScope sense: this is a platform
 * administration query, and the caller has already been established as an
 * administrator. The tenant is a *filter* here rather than a boundary, which is
 * the distinction between the two flows — tenant members reach their own
 * records through a scope they cannot forge, while an administrator reaches
 * across tenants because that is the job, under an authorization check of its
 * own and with the reading itself recorded.
 *
 * Cursor paginated on id, which is stable under inserts in a way offset
 * pagination is not — and this table only ever grows.
 */
export async function listAuditEvents(filter: AuditFilter = {}) {
  const events = await withDbRetry(() =>
    prisma.auditLog.findMany({
      where: {
        ...(filter.organizationId ? { organizationId: filter.organizationId } : {}),
        ...(filter.action ? { action: filter.action } : {}),
        ...(filter.result ? { result: filter.result } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: AUDIT_PAGE_SIZE + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        action: true,
        result: true,
        actorId: true,
        actorRole: true,
        organizationId: true,
        subjectType: true,
        subjectId: true,
        requestId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  )

  const hasMore = events.length > AUDIT_PAGE_SIZE
  const page = hasMore ? events.slice(0, AUDIT_PAGE_SIZE) : events

  // Resolved in one query rather than per row. Actors are global users, and an
  // actor may have been deleted since — a missing name is shown as the raw id
  // rather than dropping the entry, because the entry is the point.
  const actorIds = [...new Set(page.map((e) => e.actorId).filter(Boolean))] as string[]
  const actors = actorIds.length
    ? await withDbRetry(() =>
        prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        }),
      )
    : []
  const actorById = new Map(actors.map((a) => [a.id, a]))

  // Tenants may have been deleted; the audit entry outlives them on purpose,
  // so the name falls back to whatever the metadata recorded at the time.
  const orgIds = [...new Set(page.map((e) => e.organizationId).filter(Boolean))] as string[]
  const orgs = orgIds.length
    ? await withDbRetry(() =>
        prisma.clinicSettings.findMany({
          where: { organizationId: { in: orgIds } },
          select: { organizationId: true, subdomain: true, displayName: true },
        }),
      )
    : []
  const orgById = new Map(orgs.map((o) => [o.organizationId, o]))

  return {
    events: page.map((event) => {
      const meta = (event.metadata ?? {}) as Record<string, unknown>
      const org = event.organizationId ? orgById.get(event.organizationId) : null
      return {
        id: event.id,
        action: event.action,
        result: event.result,
        createdAt: event.createdAt,
        requestId: event.requestId,
        subjectType: event.subjectType,
        subjectId: event.subjectId,
        actor: event.actorId
          ? {
              id: event.actorId,
              name: actorById.get(event.actorId)?.name ?? null,
              email: actorById.get(event.actorId)?.email ?? null,
              role: event.actorRole,
            }
          : null,
        tenant: event.organizationId
          ? {
              organizationId: event.organizationId,
              /** Null once the tenant is gone; the metadata keeps its name. */
              subdomain:
                org?.subdomain ??
                (typeof meta.subdomain === "string" ? meta.subdomain : null),
              displayName: org?.displayName ?? null,
              deleted: !org,
            }
          : null,
        metadata: meta,
      }
    }),
    hasMore,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  }
}

export type AuditEventRow = Awaited<ReturnType<typeof listAuditEvents>>["events"][number]

/** Distinct actions present, so the filter offers only what exists. */
export async function listAuditActions() {
  const rows = await withDbRetry(() =>
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true } }),
  )
  return rows
    .map((r) => ({ action: r.action, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
}
