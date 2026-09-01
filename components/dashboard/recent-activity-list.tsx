"use client"

import { useState } from "react"
import { IconReceipt } from "@tabler/icons-react"

import { DashboardEmptyState } from "@/components/dashboard/dashboard-card"
import { Button } from "@/components/ui/button"
import {
  getLedgerDetail,
  getLedgerFullLabel,
  getLedgerShortLabel,
} from "@/lib/dashboard/ledger-label"
import { cn } from "@/lib/utils"

export type RecentActivityEntry = {
  delta: number
  reason: string
  createdAt: string | Date
  metadata: unknown
}

const PREVIEW_COUNT = 5

function formatWhen(createdAt: string | Date): string {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatActivityDelta(entry: RecentActivityEntry): string {
  // A chat debit spends the message allowance, not scans, so it reads as one
  // message rather than the token amount behind it.
  if (entry.reason === "chat_token_debit") {
    return "-1"
  }

  return `${entry.delta > 0 ? "+" : ""}${entry.delta.toLocaleString()}`
}

function ActivityRow({ entry }: { entry: RecentActivityEntry }) {
  const detail = getLedgerDetail(entry.reason)
  const fullLabel = getLedgerFullLabel(entry.reason)
  const deltaLabel = formatActivityDelta(entry)

  return (
    <li
      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 border-b border-border py-2 last:border-0"
      title={fullLabel}
    >
      <div className="min-w-0">
        <p className="truncate text-sm capitalize text-foreground">
          {getLedgerShortLabel(entry.reason)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatWhen(entry.createdAt)}
          {detail ? ` · ${detail}` : null}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 pt-0.5 text-sm font-medium tabular-nums",
          entry.delta > 0 || entry.reason === "chat_token_debit"
            ? "text-foreground"
            : "text-muted-foreground",
        )}
      >
        {deltaLabel}
      </span>
    </li>
  )
}

export function RecentActivityList({
  entries,
}: {
  entries: RecentActivityEntry[]
}) {
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) {
    return (
      <DashboardEmptyState
        icon={IconReceipt}
        title="No activity yet"
        description="Scan grants and debits will show up here as you use your allowance."
      />
    )
  }

  const canExpand = entries.length > PREVIEW_COUNT
  const visibleEntries = expanded ? entries : entries.slice(0, PREVIEW_COUNT)

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div
        className={cn(
          expanded && "max-h-[min(320px,45vh)] overflow-y-auto",
        )}
      >
        <ul className="px-3 text-sm">
          {visibleEntries.map((entry, index) => (
            <ActivityRow key={`${entry.reason}-${entry.createdAt}-${index}`} entry={entry} />
          ))}
        </ul>
      </div>
      {canExpand ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {expanded
              ? `${entries.length} recent entries`
              : `Showing ${PREVIEW_COUNT} of ${entries.length}`}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show less" : "Show all"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
