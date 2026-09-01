"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import type { ProductJobStatus } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { cancelJobs, enqueueJob } from "@/lib/products/jobs/queue"

/**
 * Queueing product-intelligence work, and reporting on it.
 *
 * The tenant a job belongs to is read from the product's own row, never from
 * the caller's payload. A caller who could name the organisation could queue
 * work against a catalogue they cannot otherwise reach, and the job would then
 * be drained by a background process with no session to check it against —
 * which is the one place a tenant mistake would never be noticed.
 */

export type QueueExtractionResult = {
  batchId: string
  queued: number
  /** Already had outstanding work; nothing new was created for these. */
  alreadyQueued: number
  /** Named but not found, or outside what the caller may act on. */
  skipped: number
}

export async function queueProductExtractionAction(input: {
  productIds: string[]
  force?: boolean
}): Promise<QueueExtractionResult> {
  const session = await requireAdmin()
  const batchId = randomUUID()

  // Read back the products rather than trusting the ids. This settles both
  // existence and ownership in one query, and gives each job the organisation
  // its product actually belongs to.
  const products = await prisma.product.findMany({
    where: { id: { in: input.productIds } },
    select: { id: true, organizationId: true },
  })

  const result: QueueExtractionResult = {
    batchId,
    queued: 0,
    alreadyQueued: 0,
    skipped: input.productIds.length - products.length,
  }

  for (const product of products) {
    const enqueued = await enqueueJob({
      kind: "intelligence_extraction",
      productId: product.id,
      organizationId: product.organizationId,
      batchId,
      force: input.force ?? false,
      requestedById: session.user.id,
    })

    if (enqueued.enqueued) result.queued += 1
    else result.alreadyQueued += 1
  }

  revalidatePath("/admin/products")
  return result
}

export type JobBatchProgress = {
  batchId: string
  total: number
  byStatus: Record<ProductJobStatus, number>
  /** Names of products still queued or running, for a live view. */
  outstanding: Array<{ productId: string | null; status: ProductJobStatus }>
  /** True once nothing in the batch can still change on its own. */
  finished: boolean
  /** Set when something in the batch is waiting on the provider allowance. */
  waitingForQuota: boolean
}

const EMPTY_COUNTS: Record<ProductJobStatus, number> = {
  queued: 0,
  running: 0,
  succeeded: 0,
  failed: 0,
  cancelled: 0,
}

export async function getJobBatchProgressAction(
  batchId: string,
): Promise<JobBatchProgress> {
  await requireAdmin()

  const jobs = await prisma.productJob.findMany({
    where: { batchId },
    select: { productId: true, status: true, error: true, runAfter: true },
    orderBy: { createdAt: "asc" },
  })

  const byStatus = { ...EMPTY_COUNTS }
  for (const job of jobs) byStatus[job.status] += 1

  const outstanding = jobs
    .filter((job) => job.status === "queued" || job.status === "running")
    .map((job) => ({ productId: job.productId, status: job.status }))

  return {
    batchId,
    total: jobs.length,
    byStatus,
    outstanding,
    finished: outstanding.length === 0 && jobs.length > 0,
    // A deferral is a queued job whose next attempt is some way off, which is
    // what the quota stop leaves behind.
    waitingForQuota: jobs.some(
      (job) =>
        job.status === "queued" &&
        job.runAfter.getTime() > Date.now() + 60 * 60 * 1000,
    ),
  }
}

export type QueueSummary = {
  queued: number
  running: number
  failed: number
  /** Earliest time anything queued becomes eligible, when it is not now. */
  nextRunAfter: string | null
}

/** Queue health for the admin surface. Real rows, no estimates. */
export async function getQueueSummaryAction(): Promise<QueueSummary> {
  await requireAdmin()

  const [queued, running, failed, next] = await Promise.all([
    prisma.productJob.count({ where: { status: "queued" } }),
    prisma.productJob.count({ where: { status: "running" } }),
    prisma.productJob.count({ where: { status: "failed" } }),
    prisma.productJob.findFirst({
      where: { status: "queued", runAfter: { gt: new Date() } },
      orderBy: { runAfter: "asc" },
      select: { runAfter: true },
    }),
  ])

  return {
    queued,
    running,
    failed,
    nextRunAfter: next?.runAfter.toISOString() ?? null,
  }
}

export async function cancelJobBatchAction(batchId: string): Promise<number> {
  await requireAdmin()
  const cancelled = await cancelJobs({ batchId })
  revalidatePath("/admin/products")
  return cancelled
}
