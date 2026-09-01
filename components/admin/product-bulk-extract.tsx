"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { IconPlayerPlay, IconX } from "@tabler/icons-react"

import {
  cancelJobBatchAction,
  getJobBatchProgressAction,
  queueProductExtractionAction,
  type JobBatchProgress,
} from "@/lib/products/jobs/actions"
import { Button } from "@/components/ui/button"

/**
 * Queues extraction for a selection and reports on it.
 *
 * This component no longer performs the work. It used to loop through the
 * selection calling the server once per product, which meant closing the tab
 * abandoned whatever was left — the run existed only as long as the page did.
 * Now it enqueues durable jobs and polls; the drain happens server-side on a
 * schedule and finishes with or without anybody watching.
 *
 * Leaving this page is therefore safe, and the copy says so rather than warning
 * against it.
 */

/** Often enough to feel live, rarely enough to be unnoticeable on the server. */
const POLL_MS = 4000

type ProductBulkExtractProps = {
  selected: Array<{ id: string; name: string }>
  onClear: () => void
}

export function ProductBulkExtract({ selected, onClear }: ProductBulkExtractProps) {
  const router = useRouter()
  const [batchId, setBatchId] = useState<string | null>(null)
  const [progress, setProgress] = useState<JobBatchProgress | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const refreshedRef = useRef(false)

  const poll = useCallback(async (id: string) => {
    const next = await getJobBatchProgressAction(id)
    setProgress(next)
    return next
  }, [])

  useEffect(() => {
    if (!batchId) return

    let active = true
    refreshedRef.current = false

    const tick = async () => {
      if (!active) return
      const next = await poll(batchId).catch(() => null)

      // Refresh the catalogue once the batch settles, so the table reflects
      // what the queue actually did. Guarded so a finished batch left on screen
      // does not refresh on every subsequent tick.
      if (next?.finished && !refreshedRef.current) {
        refreshedRef.current = true
        router.refresh()
      }
    }

    void tick()
    const timer = setInterval(tick, POLL_MS)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [batchId, poll, router])

  async function queue() {
    setBusy(true)
    setNotice(null)
    try {
      const result = await queueProductExtractionAction({
        productIds: selected.map((product) => product.id),
        // Explicitly forced: the administrator picked these products, which is
        // a different intent from the scheduled pass that takes only what is due.
        force: true,
      })

      setBatchId(result.batchId)
      setNotice(
        [
          `${result.queued} queued.`,
          result.alreadyQueued > 0
            ? `${result.alreadyQueued} already had work outstanding.`
            : null,
          result.skipped > 0 ? `${result.skipped} could not be found.` : null,
        ]
          .filter(Boolean)
          .join(" "),
      )
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!batchId) return
    const cancelled = await cancelJobBatchAction(batchId)
    setNotice(`${cancelled} outstanding job(s) cancelled.`)
    await poll(batchId)
    router.refresh()
  }

  const done = progress
    ? progress.byStatus.succeeded + progress.byStatus.failed + progress.byStatus.cancelled
    : 0

  return (
    <div className="space-y-3 rounded-sm border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            {selected.length} product{selected.length === 1 ? "" : "s"} selected
          </p>
          <p className="text-xs text-muted-foreground">
            Extraction runs on the server, paced inside the provider allowance.
            You can leave this page — the work continues without it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={queue}
            disabled={busy || selected.length === 0}
          >
            <IconPlayerPlay className="size-3.5" aria-hidden />
            {busy ? "Queueing…" : "Queue extraction"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onClear()
              setBatchId(null)
              setProgress(null)
              setNotice(null)
            }}
          >
            <IconX className="size-3.5" aria-hidden />
            Clear
          </Button>
        </div>
      </div>

      {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}

      {progress ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {done} of {progress.total} processed
            {progress.byStatus.running > 0 ? " · 1 running" : ""}
            {progress.byStatus.queued > 0 ? ` · ${progress.byStatus.queued} queued` : ""}
            {progress.byStatus.failed > 0 ? ` · ${progress.byStatus.failed} failed` : ""}
          </p>

          {progress.waitingForQuota ? (
            <p className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              Provider quota reached. The remaining products stay queued and will
              be picked up automatically once the allowance resets — nothing was
              marked failed.
            </p>
          ) : null}

          {progress.finished ? (
            <p className="text-xs text-muted-foreground">
              Batch complete. {progress.byStatus.succeeded} succeeded
              {progress.byStatus.failed > 0
                ? `, ${progress.byStatus.failed} failed`
                : ""}
              {progress.byStatus.cancelled > 0
                ? `, ${progress.byStatus.cancelled} cancelled`
                : ""}
              .
            </p>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>
              Cancel remaining
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
