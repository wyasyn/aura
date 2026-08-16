import { cache } from "react"
import { connection } from "next/server"

import { utcDaysAgo } from "@/lib/admin/periods"
import { getAdminUsageSnapshot } from "@/lib/admin/usage-analytics"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import { AVG_CHAT_TOKENS_PER_MESSAGE } from "@/lib/scans/constants"

function toMessageCount(tokens: bigint | null | undefined): number {
  return Math.floor(Number(tokens ?? BigInt(0)) / AVG_CHAT_TOKENS_PER_MESSAGE)
}

export const getUserDashboardStats = cache(async (userId: string) => {
  await connection()
  return withDbRetry(async () => {
    const [balance, scanCount, ledgerAgg] = await Promise.all([
      prisma.scanBalance.findUnique({ where: { userId } }),
      prisma.scan.count({ where: { userId } }),
      prisma.scanLedger.aggregate({
        where: { userId, delta: { lt: 0 } },
        _sum: { delta: true },
      }),
    ])

    const [recentLedger, profile, location] = await Promise.all([
      prisma.scanLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 14,
        select: {
          delta: true,
          reason: true,
          tier: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          skinType: true,
          primaryConcerns: true,
          onboardingCompletedAt: true,
        },
      }),
      prisma.userLocation.findUnique({
        where: { userId },
        select: { city: true, region: true, climateZone: true },
      }),
    ])

    const dailyUsage = bucketByDay(
      recentLedger.filter((e) => e.delta < 0),
      14,
    )

    return {
      remaining: balance?.remaining ?? 0,
      lifetimeUsed: balance?.lifetimeUsed ?? 0,
      lifetimeGranted: balance?.lifetimeGranted ?? 0,
      // Current plan period. Each pack purchase restarts these at zero.
      periodUsed: balance?.periodUsed ?? 0,
      periodGranted: balance?.periodGranted ?? 0,
      periodStartedAt: balance?.periodStartedAt ?? null,
      // Chat allowance is metered in tokens internally, but users only ever see
      // it as an estimated message count: raw token counts read as billing
      // internals, not as something they can act on.
      chatMessagesRemaining: toMessageCount(balance?.tokenBudgetRemaining),
      chatMessagesUsed: toMessageCount(balance?.lifetimeTokensUsed),
      scanCount,
      totalDebited: Math.abs(ledgerAgg._sum.delta ?? 0),
      profile,
      location,
      dailyUsage,
      recentActivity: recentLedger,
    }
  })
})

export const getAdminDashboardStats = cache(async () => {
  await connection()
  return withDbRetry(async () => {
    const thirtyDaysAgo = utcDaysAgo(30)

    const [userCount, scanCount, productCount, usageSnapshot] = await Promise.all([
      prisma.user.count(),
      prisma.scan.count(),
      prisma.product.count({ where: { isActive: true } }),
      getAdminUsageSnapshot(),
    ])

    const [usersByRole, scansByStatus, recentUsers, scanActivity] =
      await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
      prisma.scan.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.scanLedger.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { delta: true, reason: true, createdAt: true },
      }),
    ])

    const grantsByDay = bucketLedgerByDay(
      scanActivity.filter((e) => e.delta > 0),
      14,
    )
    const usageByDay = bucketLedgerByDay(
      scanActivity.filter((e) => e.delta < 0),
      14,
    )

    return {
      userCount,
      scanCount,
      productCount,
      scansGranted: usageSnapshot.scansGranted,
      scansUsed: usageSnapshot.scansUsed,
      scansToday: usageSnapshot.scansToday,
      chatsToday: usageSnapshot.chatsToday,
      aiTokens: usageSnapshot.allTimeTokens.totalTokens,
      estimatedCostMicros: usageSnapshot.allTimeTokens.estimatedCostMicros,
      tokenBreakdown: usageSnapshot.allTimeTokens,
      usersByRole: usersByRole.map((r) => ({
        role: r.role ?? "user",
        count: r._count.role,
      })),
      scansByStatus: scansByStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      recentUsers,
      grantsByDay,
      usageByDay,
      aiTokensByDay: usageSnapshot.tokenSeries14.map((bucket) => ({
        label: bucket.label,
        value: bucket.tokens,
      })),
      costByDay: usageSnapshot.costSeries14,
      costPerScanLoadedMicros: usageSnapshot.costPerScanLoadedMicros,
      revenueMicros: usageSnapshot.revenueMicros,
      grossMarginPercent: usageSnapshot.grossMarginPercent,
      simulatedPayments: usageSnapshot.simulatedPayments,
    }
  })
})

function bucketByDay(
  entries: { delta: number; createdAt: Date }[],
  days: number,
): { label: string; value: number }[] {
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(utcDaysAgo(i).toISOString().slice(0, 10), 0)
  }
  for (const entry of entries) {
    const key = entry.createdAt.toISOString().slice(0, 10)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Math.abs(entry.delta))
    }
  }
  return Array.from(buckets.entries()).map(([label, value]) => ({
    label: label.slice(5),
    value,
  }))
}

function bucketLedgerByDay(
  entries: { delta: number; createdAt: Date }[],
  days: number,
) {
  return bucketByDay(entries, days)
}
