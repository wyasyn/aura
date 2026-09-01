import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { listAuditActions, listAuditEvents } from "@/lib/admin/audit-queries"
import { requireAdmin } from "@/lib/auth/session"

const RESULT_VARIANT = {
  success: "outline",
  denied: "destructive",
  failure: "secondary",
} as const

function isResult(value: string | null): value is "success" | "denied" | "failure" {
  return value === "success" || value === "denied" || value === "failure"
}

export async function AuditLogLoader({
  action,
  result,
  cursor,
}: {
  action: string | null
  result: string | null
  cursor: string | null
}) {
  // Asserted here, not left to the layout. A layout and the page beneath it
  // render in parallel, so the gate's redirect does not stop this loader.
  await requireAdmin()

  const [{ events, hasMore, nextCursor }, actions] = await Promise.all([
    listAuditEvents({
      action,
      result: isResult(result) ? result : null,
      cursor,
    }),
    listAuditActions(),
  ])

  const query = (next: Record<string, string | null>) => {
    const params = new URLSearchParams()
    const merged = { action, result, ...next }
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    const qs = params.toString()
    return qs ? `/admin/audit?${qs}` : "/admin/audit"
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={query({ action: null, cursor: null })}
          className={`rounded-full border px-3 py-1 text-xs ${
            action ? "border-border/60" : "border-foreground/40 font-medium"
          }`}
        >
          All actions
        </Link>
        {actions.slice(0, 12).map((entry) => (
          <Link
            key={entry.action}
            href={query({ action: entry.action, cursor: null })}
            className={`rounded-full border px-3 py-1 text-xs ${
              action === entry.action
                ? "border-foreground/40 font-medium"
                : "border-border/60"
            }`}
          >
            {entry.action}
            <span className="text-muted-foreground ml-1.5 tabular-nums">
              {entry.count}
            </span>
          </Link>
        ))}
        <Link
          href={query({ result: result === "denied" ? null : "denied", cursor: null })}
          className={`rounded-full border px-3 py-1 text-xs ${
            result === "denied"
              ? "border-destructive/50 text-destructive font-medium"
              : "border-border/60"
          }`}
        >
          Denied only
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
          No audit events match this filter.
        </div>
      ) : (
        <ul className="divide-border divide-y rounded-xl border border-border/60">
          {events.map((event) => (
            <li key={event.id} className="space-y-1.5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-sm font-medium">{event.action}</code>
                <Badge variant={RESULT_VARIANT[event.result]}>{event.result}</Badge>
                {event.tenant ? (
                  <Badge variant="outline">
                    {event.tenant.subdomain ?? event.tenant.organizationId.slice(0, 8)}
                    {event.tenant.deleted ? " · deleted" : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline">platform</Badge>
                )}
              </div>

              <p className="text-muted-foreground text-sm">
                {event.actor
                  ? `${event.actor.name ?? event.actor.email ?? event.actor.id}${
                      event.actor.role ? ` (${event.actor.role})` : ""
                    }`
                  : "system"}
                {" · "}
                {event.subjectType}
                {event.subjectId ? ` ${event.subjectId.slice(0, 8)}` : ""}
                {" · "}
                {event.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </p>

              {Object.keys(event.metadata).length > 0 ? (
                <p className="text-muted-foreground font-mono text-xs break-all">
                  {JSON.stringify(event.metadata)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <Link
          href={query({ cursor: nextCursor })}
          className="inline-block text-sm underline underline-offset-4"
        >
          Older events
        </Link>
      ) : null}
    </div>
  )
}
