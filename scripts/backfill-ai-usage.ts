/**
 * Backfill the ai_usage log from existing ScanUsage and ChatMessage rows so
 * admin analytics keeps its history after the switch.
 * Run once after migrating: npx tsx scripts/backfill-ai-usage.ts
 *
 * Idempotent: scan rows are matched on scanId, chat rows on chatMessageId.
 */
import "dotenv/config"

import type { Prisma } from "../generated/prisma/client"
import { prisma } from "../lib/db/client"
import { withDbRetry } from "../lib/db/retry"

const BATCH_SIZE = 200

async function backfillScans(): Promise<number> {
  let cursor: string | undefined
  let inserted = 0

  for (;;) {
    const rows = await withDbRetry(() =>
      prisma.scanUsage.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: {
          id: true,
          scanId: true,
          provider: true,
          modelId: true,
          inputTokens: true,
          outputTokens: true,
          cachedTokens: true,
          reasoningTokens: true,
          totalTokens: true,
          estimatedCostMicros: true,
          latencyMs: true,
          rawUsage: true,
          createdAt: true,
          scan: { select: { userId: true, captureMode: true } },
        },
      }),
    )

    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id

    const existing = await withDbRetry(() =>
      prisma.aiUsage.findMany({
        where: {
          scanId: { in: rows.map((row) => row.scanId) },
          feature: { in: ["scan_analyze", "scan_live"] },
        },
        select: { scanId: true },
      }),
    )
    const seen = new Set(existing.map((row) => row.scanId))

    const data = rows
      .filter((row) => !seen.has(row.scanId))
      .map((row) => ({
        feature:
          row.scan.captureMode === "live"
            ? ("scan_live" as const)
            : ("scan_analyze" as const),
        provider: row.provider,
        modelId: row.modelId,
        userId: row.scan.userId,
        scanId: row.scanId,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        cachedTokens: row.cachedTokens,
        reasoningTokens: row.reasoningTokens,
        totalTokens: row.totalTokens,
        estimatedCostMicros: row.estimatedCostMicros,
        latencyMs: row.latencyMs,
        rawUsage: (row.rawUsage ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        createdAt: row.createdAt,
      }))

    if (data.length > 0) {
      const result = await withDbRetry(() =>
        prisma.aiUsage.createMany({ data }),
      )
      inserted += result.count
    }
  }

  return inserted
}

async function backfillChat(): Promise<number> {
  let cursor: string | undefined
  let inserted = 0

  for (;;) {
    const rows = await withDbRetry(() =>
      prisma.chatMessage.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        where: { role: "assistant", blocked: false, totalTokens: { gt: 0 } },
        select: {
          id: true,
          conversationId: true,
          modelId: true,
          inputTokens: true,
          outputTokens: true,
          cachedTokens: true,
          reasoningTokens: true,
          totalTokens: true,
          estimatedCostMicros: true,
          createdAt: true,
          conversation: { select: { userId: true, scanId: true } },
        },
      }),
    )

    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id

    const existing = await withDbRetry(() =>
      prisma.aiUsage.findMany({
        where: { chatMessageId: { in: rows.map((row) => row.id) } },
        select: { chatMessageId: true },
      }),
    )
    const seen = new Set(existing.map((row) => row.chatMessageId))

    const data = rows
      .filter((row) => !seen.has(row.id))
      .map((row) => ({
        feature: "chat_reply" as const,
        provider: "gemini" as const,
        // Legacy rows predate per-message model tracking; keep their tokens
        // rather than dropping them from history.
        modelId: row.modelId ?? "unknown",
        userId: row.conversation.userId,
        scanId: row.conversation.scanId,
        conversationId: row.conversationId,
        chatMessageId: row.id,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        cachedTokens: row.cachedTokens,
        reasoningTokens: row.reasoningTokens,
        totalTokens: row.totalTokens,
        estimatedCostMicros: row.estimatedCostMicros,
        createdAt: row.createdAt,
      }))

    if (data.length > 0) {
      const result = await withDbRetry(() =>
        prisma.aiUsage.createMany({ data }),
      )
      inserted += result.count
    }
  }

  return inserted
}

async function main() {
  // Neon can be cold: wake it before the first real query.
  await withDbRetry(() => prisma.$queryRaw`SELECT 1`)

  const scans = await backfillScans()
  const chat = await backfillChat()
  console.log(`Backfilled ${scans} scan rows and ${chat} chat rows into ai_usage.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
