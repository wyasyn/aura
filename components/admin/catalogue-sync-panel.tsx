"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { IconRefresh } from "@tabler/icons-react"

import type { CatalogueHealth } from "@/lib/products/catalogue-health"
import { syncProductsFromStoreAction } from "@/lib/products/ingest/actions"
import { Button } from "@/components/ui/button"

/**
 * Catalogue synchronisation, and what the last one actually did.
 *
 * Every number here is read from a persisted ProductSyncRun row. A dash means
 * no sync has run, not zero — the two look the same on a dashboard and mean
 * very different things.
 */

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-muted/20 px-3 py-2">
      <p className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-lg font-medium text-foreground tabular-nums">{value}</p>
      {hint ? <p className="text-[0.65rem] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function formatWhen(value: Date | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

type CatalogueSyncPanelProps = {
  health: CatalogueHealth
}

export function CatalogueSyncPanel({ health }: CatalogueSyncPanelProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { lastSync } = health

  function runSync() {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      try {
        const result = await syncProductsFromStoreAction()
        setMessage(result.message)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sync failed.")
      }
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-medium">Catalogue source</h2>
          <p className="text-xs text-muted-foreground">
            {health.wooCommerceConfigured
              ? "WooCommerce credentials are configured. The store owns product names, prose, price, image and stock."
              : "WooCommerce credentials are not configured — syncing falls back to the bundled seed file."}
          </p>
        </div>
        <Button type="button" size="sm" onClick={runSync} disabled={pending}>
          <IconRefresh className="size-3.5" aria-hidden />
          {pending ? "Syncing…" : "Sync products"}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Last sync"
          value={lastSync ? lastSync.status : "—"}
          hint={lastSync ? formatWhen(lastSync.finishedAt ?? lastSync.startedAt) : "Never run"}
        />
        <Stat label="Discovered" value={lastSync ? String(lastSync.discovered) : "—"} />
        <Stat label="Created" value={lastSync ? String(lastSync.created) : "—"} />
        <Stat label="Updated" value={lastSync ? String(lastSync.updated) : "—"} />
        <Stat label="Unchanged" value={lastSync ? String(lastSync.unchanged) : "—"} />
        <Stat
          label="Archived"
          value={lastSync ? String(lastSync.archived) : "—"}
          hint="Never deleted"
        />
      </div>

      {lastSync?.error ? (
        <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Last sync reported: {lastSync.error}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Products"
          value={String(health.total)}
          hint={Object.entries(health.bySource)
            .map(([source, count]) => `${source} ${count}`)
            .join(" · ")}
        />
        <Stat
          label="Active"
          value={String(health.active)}
          hint="Listed in the catalogue"
        />
        <Stat
          label="Recommendable"
          value={String(health.recommendable)}
          hint="The engine may select these"
        />
        <Stat
          label="Data complete"
          value={String(health.dataComplete)}
          hint={`${health.aboveConfidenceThreshold} above the engine threshold`}
        />
        <Stat
          label="Need extraction"
          value={String(health.needingExtraction)}
          hint={`${health.stale} stale · ${health.failed} failed`}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Extracted"
          value={String(health.byIntelligenceStatus.extracted ?? 0)}
          hint="Complete enough for the engine"
        />
        <Stat
          label="Needs review"
          value={String(health.byIntelligenceStatus.needs_review ?? 0)}
          hint="Extracted, but too little established"
        />
        <Stat
          label="Pending"
          value={String(health.byIntelligenceStatus.pending ?? 0)}
          hint="Never extracted, or source changed"
        />
        <Stat
          label="Verified"
          value={String(health.verified)}
          hint={`${health.unverified} unverified`}
        />
        <Stat
          label="Eligible"
          value={String(health.eligible)}
          hint="Meets every engine requirement"
        />
      </div>

      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  )
}
