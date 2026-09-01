import { NextResponse } from "next/server"

import { authorizeCronRequest } from "@/lib/cron/authorize"
import { drainProductJobs } from "@/lib/products/jobs/worker"

/**
 * Drains the product-intelligence queue on a schedule.
 *
 * This is what makes the queue durable rather than merely persisted. An
 * administrator queues work and closes the tab; this picks it up regardless,
 * because the work is a row in Postgres and this route can reach it.
 *
 * A queue that cannot be emptied in one pass is not a problem, it is the
 * design: each tick takes a few jobs and the next tick takes the next few.
 */

/**
 * Longer than the default, because each job is a model call.
 *
 * Three jobs is a handful of seconds normally, but a rate-limited one waits for
 * the delay the provider asks for, which can be half a minute on its own.
 */
export const maxDuration = 60

export async function GET(request: Request) {
  const authorized = authorizeCronRequest(request)
  if (!authorized.ok) return authorized.response

  const outcome = await drainProductJobs({
    // Sized against the invocation budget rather than the queue. Three jobs
    // leaves room for one of them to be rate-limited and waited out without
    // the function being killed mid-write.
    limit: 3,
    // No fixed pause between jobs here. The CLI paces itself because it may run
    // for an hour, but a scheduled tick has a wall clock to respect, and
    // sleeping through it would spend the budget on waiting rather than work.
    // Actual rate limits are still honoured — withRateLimitRetry waits for
    // exactly as long as the provider asks, only when the provider asks.
    paceMs: 0,
  })

  return NextResponse.json({ ok: true, ...outcome })
}
