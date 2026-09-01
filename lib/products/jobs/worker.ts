import type { ProductJob } from "@/generated/prisma/client"

import { revalidateCatalogContext } from "@/lib/ai/context/cache-tags"
import { DailyQuotaExhausted } from "@/lib/products/enrich/rate-limit"
import { extractProductIntelligence } from "@/lib/products/intelligence/extract-product"
import {
  claimNextJob,
  completeJob,
  deferJob,
  failJob,
  workerId,
} from "@/lib/products/jobs/queue"

/**
 * Drains the product-intelligence queue.
 *
 * Runs wherever something can reach the database: a cron tick, a CLI command,
 * or an administrator's request kicking it along. Nothing about the work
 * depends on a browser being open, which is the whole point — the previous
 * bulk extraction was a loop in a page, and closing the tab abandoned it.
 *
 * Sequential on purpose. The provider allows five requests a minute, so
 * parallelism would buy nothing but rate-limit errors, and one job at a time
 * means a killed function loses at most one product's work.
 */

/** Waits between jobs, just inside the provider's per-minute allowance. */
const PACE_MS = 13_000

/**
 * When the provider's daily allowance is exhausted, the next attempt is not
 * worth making until it resets. Deferring to the next UTC midnight matches how
 * the allowance is actually counted, rather than guessing at an interval.
 */
function nextQuotaReset(now = new Date()): Date {
  const reset = new Date(now)
  reset.setUTCHours(24, 0, 0, 0)
  return reset
}

export type DrainOutcome = {
  claimed: number
  succeeded: number
  failed: number
  retrying: number
  /** Set when the provider's daily allowance stopped the run. */
  deferredForQuota: boolean
}

export type DrainOptions = {
  /** Most jobs to take in one pass. A cron tick should not run forever. */
  limit?: number
  /** Milliseconds between jobs. Zero in tests. */
  paceMs?: number
  /** Injected by tests so the queue can be driven without a provider. */
  runJob?: (job: ProductJob) => Promise<unknown>
}

/**
 * Performs one job.
 *
 * `catalogue_sync` is deliberately not implemented yet. The WooCommerce
 * connector is structurally ready and dormant until credentials are supplied,
 * and a handler that quietly did nothing would report success for work that
 * never happened.
 */
async function performJob(job: ProductJob): Promise<unknown> {
  switch (job.kind) {
    case "intelligence_extraction": {
      if (!job.productId) {
        throw new Error("An extraction job must name a product")
      }
      return extractProductIntelligence(job.productId, { force: job.force })
    }
    case "catalogue_sync":
      throw new Error(
        "Catalogue sync jobs are not enabled yet — the store connector is dormant until credentials are supplied",
      )
  }
}

export async function drainProductJobs(
  options: DrainOptions = {},
): Promise<DrainOutcome> {
  const limit = options.limit ?? 5
  const paceMs = options.paceMs ?? PACE_MS
  const run = options.runJob ?? performJob
  const worker = workerId()

  const outcome: DrainOutcome = {
    claimed: 0,
    succeeded: 0,
    failed: 0,
    retrying: 0,
    deferredForQuota: false,
  }

  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextJob(worker)
    if (!job) break

    outcome.claimed += 1

    try {
      const result = await run(job)
      await completeJob(job.id, result)
      outcome.succeeded += 1
    } catch (err) {
      // The allowance being spent is a fact about the account, not about this
      // product. It goes back untouched, and the drain stops rather than
      // marching through the rest of the queue collecting the same error.
      if (err instanceof DailyQuotaExhausted) {
        await deferJob(job, nextQuotaReset(), "Provider daily quota exhausted")
        outcome.deferredForQuota = true
        break
      }

      const message = err instanceof Error ? err.message : String(err)
      const { willRetry } = await failJob(job, message)
      if (willRetry) outcome.retrying += 1
      else outcome.failed += 1
    }

    if (index < limit - 1 && paceMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, paceMs))
    }
  }

  if (outcome.succeeded > 0) {
    // A CLI drain has no request context, and failing to clear a cache must
    // never undo work that already succeeded.
    try {
      revalidateCatalogContext()
    } catch {
      console.warn(
        "[jobs] Catalogue cache not invalidated (no request context)." +
          " A running server refreshes within its revalidate window.",
      )
    }
  }

  return outcome
}
