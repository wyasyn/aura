import { randomUUID } from "node:crypto"

import type { ProductJob, ProductJobKind } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

/**
 * The durable queue behind product-intelligence work.
 *
 * Claiming is the part that has to be right. Two drains can run at once — a
 * cron tick overlapping a manual one, or two instances of the same function —
 * and if both read the same queued row, the same product is extracted twice and
 * the provider is billed twice for one answer. `FOR UPDATE SKIP LOCKED` makes
 * the read and the claim one statement: the second drain never sees the row the
 * first is taking, and skips to the next instead of blocking behind it.
 *
 * That cannot be expressed through the query builder, which is the only reason
 * this file drops to SQL.
 */

/** How long a claimed job may sit before another drain may take it back. */
export const LEASE_MINUTES = 10

/** Waits between retries. Index is the attempt that just failed. */
const BACKOFF_MINUTES = [1, 5, 30]

export type EnqueueInput = {
  kind: ProductJobKind
  productId?: string | null
  /** Resolved from the caller's session, never from a payload. */
  organizationId?: string | null
  batchId?: string | null
  force?: boolean
  requestedById?: string | null
  maxAttempts?: number
}

export type EnqueueResult =
  | { enqueued: true; job: ProductJob }
  /** An unfinished job for this product already exists. */
  | { enqueued: false; reason: "already_queued" }

/**
 * Adds one job, unless the same work is already outstanding.
 *
 * The duplicate check is the database's, not this function's: a partial unique
 * index over unfinished rows settles two simultaneous requests, which no
 * read-then-write here could do. A rejected insert is a normal outcome and is
 * reported rather than thrown.
 */
export async function enqueueJob(input: EnqueueInput): Promise<EnqueueResult> {
  try {
    const job = await prisma.productJob.create({
      data: {
        kind: input.kind,
        productId: input.productId ?? null,
        organizationId: input.organizationId ?? null,
        batchId: input.batchId ?? null,
        force: input.force ?? false,
        requestedById: input.requestedById ?? null,
        ...(input.maxAttempts ? { maxAttempts: input.maxAttempts } : {}),
      },
    })
    return { enqueued: true, job }
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { enqueued: false, reason: "already_queued" }
    }
    throw err
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  )
}

/** Identifies the drain holding a lease. Only ever used for diagnosis. */
export function workerId(): string {
  return `${process.env.VERCEL_REGION ?? "local"}-${randomUUID().slice(0, 8)}`
}

/**
 * Takes the next eligible job, atomically.
 *
 * Eligible means queued and due, or running past its lease — the second case
 * recovers work whose function was killed mid-flight, which on serverless is
 * routine rather than exceptional. Without it a single terminated invocation
 * would strand a product in `running` permanently.
 */
export async function claimNextJob(worker: string): Promise<ProductJob | null> {
  const rows = await prisma.$queryRaw<ProductJob[]>`
    UPDATE "product_job"
    SET "status" = 'running',
        "lockedAt" = NOW(),
        "lockedBy" = ${worker},
        "startedAt" = COALESCE("startedAt", NOW()),
        "attempts" = "attempts" + 1,
        "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id" FROM "product_job"
      WHERE (
        ("status" = 'queued' AND "runAfter" <= NOW())
        OR ("status" = 'running'
            AND "lockedAt" < NOW() - (${LEASE_MINUTES} || ' minutes')::interval)
      )
      ORDER BY "runAfter" ASC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `

  return rows[0] ?? null
}

export async function completeJob(
  jobId: string,
  result: unknown,
): Promise<void> {
  await prisma.productJob.update({
    where: { id: jobId },
    data: {
      status: "succeeded",
      finishedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      error: null,
      result: result === undefined ? undefined : (result as object),
    },
  })
}

/**
 * Records a failed attempt, retrying while attempts remain.
 *
 * The attempt was already counted when the job was claimed, so a worker that
 * dies without reporting anything still burns one — which is the behaviour that
 * stops a job that reliably kills its function from being retried forever.
 */
export async function failJob(
  job: ProductJob,
  message: string,
): Promise<{ willRetry: boolean }> {
  const exhausted = job.attempts >= job.maxAttempts
  const backoff = BACKOFF_MINUTES[Math.min(job.attempts - 1, BACKOFF_MINUTES.length - 1)]

  await prisma.productJob.update({
    where: { id: job.id },
    data: {
      status: exhausted ? "failed" : "queued",
      error: message.slice(0, 500),
      lockedAt: null,
      lockedBy: null,
      ...(exhausted
        ? { finishedAt: new Date() }
        : { runAfter: new Date(Date.now() + backoff * 60_000) }),
    },
  })

  return { willRetry: !exhausted }
}

/**
 * Puts a job back without counting the attempt.
 *
 * For conditions that say nothing about the job: the provider's daily allowance
 * being spent is a fact about the account, not about this product, and burning
 * a retry on it would exhaust `maxAttempts` on an outage and mark perfectly
 * good work permanently failed.
 */
export async function deferJob(job: ProductJob, until: Date, reason: string): Promise<void> {
  await prisma.productJob.update({
    where: { id: job.id },
    data: {
      status: "queued",
      attempts: Math.max(0, job.attempts - 1),
      runAfter: until,
      lockedAt: null,
      lockedBy: null,
      error: reason.slice(0, 500),
    },
  })
}

/** Cancels outstanding work. Finished jobs are left as the record they are. */
export async function cancelJobs(where: {
  batchId?: string
  productId?: string
  organizationId?: string | null
}): Promise<number> {
  const result = await prisma.productJob.updateMany({
    where: {
      ...where,
      status: { in: ["queued", "running"] },
    },
    data: { status: "cancelled", finishedAt: new Date(), lockedAt: null, lockedBy: null },
  })

  return result.count
}
