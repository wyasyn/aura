import { cache } from "react"
import { connection } from "next/server"

import { Prisma } from "@/generated/prisma/client"
import {
  buildBucketKeys,
  bucketKey,
  bucketLabel,
  getBucketGranularity,
  getPeriodStart,
  startOfUtcDay,
  truncUnit,
  type UsagePeriod,
} from "@/lib/admin/periods"
import { getAdminEconomics } from "@/lib/admin/economics-queries"
import {
  deriveUnitEconomics,
  perUnit,
  type AdminEconomics,
} from "@/lib/admin/unit-economics"
import {
  addBreakdowns,
  buildRawWhere,
  buildWhere,
  emptyBreakdown,
  resolveFilters,
  SCAN_FEATURES,
  SUM_SELECT,
  toBreakdown,
  toNumber,
  type ResolvedUsageFilters,
  type TokenBreakdown,
  type UsageFilters,
  type UsageSource,
} from "@/lib/admin/usage-shared"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import { listModelRates } from "@/lib/models/queries"
import { isSimulatedProvider } from "@/lib/payments"
import {
  getChatTokensPerScanForTier,
  getTargetMarginBps,
} from "@/lib/scans/constants"

export type { UsagePeriod, UsageSource, UsageFilters, TokenBreakdown }

export type UsageTimeBucket = {
  label: string
  tokens: number
  costMicros: number
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  reasoningTokens: number
  /** Distinct scans in the bucket, so unit cost can be tracked over time. */
  scans: number
  costPerScanMicros: number | null
}

export type ModelUsageRow = {
  modelId: string
  displayName: string | null
  assignedTier: string | null
  scanCount: number
  chatCount: number
  tokens: TokenBreakdown
  /**
   * The same totals split by feature class. Per-tier cost-per-scan needs the
   * scan half on its own, and the groupBy already returns it per feature.
   */
  scanTokens: TokenBreakdown
  chatTokens: TokenBreakdown
  sharePercent: number
}

export type UserUsageRow = {
  userId: string
  name: string
  email: string
  scanCount: number
  chatCount: number
  tokens: TokenBreakdown
}

export type FeatureUsageRow = {
  feature: import("@/generated/prisma/client").AiUsageFeature
  callCount: number
  tokens: TokenBreakdown
}

export type UsageHighlights = {
  mostActiveUser: UserUsageRow | null
  mostUsedModel: ModelUsageRow | null
  scansToday: number
  chatsToday: number
}

export type AdminUsageAnalytics = {
  filters: ResolvedUsageFilters
  tokens: TokenBreakdown
  scansGranted: number
  scansUsed: number
  chatCount: number
  tokenSeries: UsageTimeBucket[]
  costSeries: { label: string; value: number }[]
  costPerScanSeries: { label: string; value: number }[]
  perModel: ModelUsageRow[]
  perUser: UserUsageRow[]
  perFeature: FeatureUsageRow[]
  highlights: UsageHighlights
  economics: AdminEconomics
}

type TimeSeriesRow = {
  bucket: string
  tokens: bigint | number | null
  cost: bigint | number | null
  input: bigint | number | null
  output: bigint | number | null
  cached: bigint | number | null
  reasoning: bigint | number | null
  scans: bigint | number | null
}

/** `to_char` output is UTC wall time, so read it back as UTC. */
function parseBucketTimestamp(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`)
}

function microsToUsd(micros: number): number {
  return Math.round((micros / 1_000_000) * 10000) / 10000
}

async function fetchTimeSeries(
  filters: ResolvedUsageFilters,
): Promise<UsageTimeBucket[]> {
  const granularity = getBucketGranularity(filters.period)
  const where = buildRawWhere(filters)

  const rows = await prisma.$queryRaw<TimeSeriesRow[]>(Prisma.sql`
    SELECT
      to_char(
        date_trunc(${truncUnit(granularity)}, "createdAt"),
        'YYYY-MM-DD HH24:MI:SS'
      ) AS bucket,
      SUM("totalTokens") AS tokens,
      SUM(COALESCE("estimatedCostMicros", 0)) AS cost,
      SUM("inputTokens") AS input,
      SUM("outputTokens") AS output,
      SUM("cachedTokens") AS cached,
      SUM(COALESCE("reasoningTokens", 0)) AS reasoning,
      COUNT(DISTINCT "scanId") AS scans
    FROM "ai_usage"
    ${where}
    GROUP BY 1
    ORDER BY 1 ASC
  `)

  const byKey = new Map<string, TimeSeriesRow>()
  for (const row of rows) {
    byKey.set(bucketKey(parseBucketTimestamp(row.bucket), granularity), row)
  }

  const earliest =
    rows.length > 0 ? parseBucketTimestamp(rows[0].bucket) : null

  return buildBucketKeys(filters.period, { earliest }).map((key) => {
    const row = byKey.get(key)
    const costMicros = toNumber(row?.cost)
    const scans = toNumber(row?.scans)

    return {
      label: bucketLabel(key, granularity),
      tokens: toNumber(row?.tokens),
      costMicros,
      inputTokens: toNumber(row?.input),
      outputTokens: toNumber(row?.output),
      cachedTokens: toNumber(row?.cached),
      reasoningTokens: toNumber(row?.reasoning),
      scans,
      costPerScanMicros: perUnit(costMicros, scans),
    }
  })
}

async function fetchPerModel(
  where: Prisma.AiUsageWhereInput,
  totalTokens: number,
): Promise<ModelUsageRow[]> {
  const [grouped, modelRates] = await Promise.all([
    prisma.aiUsage.groupBy({
      by: ["modelId", "feature"],
      where,
      _sum: SUM_SELECT,
      _count: { _all: true },
    }),
    listModelRates(),
  ])

  const meta = new Map(
    modelRates.map((rate) => [
      rate.modelId,
      { displayName: rate.displayName, assignedTier: rate.assignedTier },
    ]),
  )

  const byModel = new Map<
    string,
    {
      scanCount: number
      chatCount: number
      tokens: TokenBreakdown
      scanTokens: TokenBreakdown
      chatTokens: TokenBreakdown
    }
  >()

  for (const row of grouped) {
    const entry = byModel.get(row.modelId) ?? {
      scanCount: 0,
      chatCount: 0,
      tokens: emptyBreakdown(),
      scanTokens: emptyBreakdown(),
      chatTokens: emptyBreakdown(),
    }
    const count = row._count._all
    const breakdown = toBreakdown(row._sum)

    if (SCAN_FEATURES.has(row.feature)) {
      entry.scanCount += count
      entry.scanTokens = addBreakdowns(entry.scanTokens, breakdown)
    } else {
      entry.chatCount += count
      entry.chatTokens = addBreakdowns(entry.chatTokens, breakdown)
    }
    entry.tokens = addBreakdowns(entry.tokens, breakdown)
    byModel.set(row.modelId, entry)
  }

  return [...byModel.entries()]
    .map(([modelId, entry]) => ({
      modelId,
      displayName: meta.get(modelId)?.displayName ?? null,
      assignedTier: meta.get(modelId)?.assignedTier ?? null,
      scanCount: entry.scanCount,
      chatCount: entry.chatCount,
      tokens: entry.tokens,
      scanTokens: entry.scanTokens,
      chatTokens: entry.chatTokens,
      sharePercent:
        totalTokens > 0
          ? Math.round((entry.tokens.totalTokens / totalTokens) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.tokens.totalTokens - a.tokens.totalTokens)
}

async function fetchPerUser(
  where: Prisma.AiUsageWhereInput,
): Promise<UserUsageRow[]> {
  const top = await prisma.aiUsage.groupBy({
    by: ["userId"],
    where: { ...where, userId: { not: null } },
    _sum: SUM_SELECT,
    orderBy: { _sum: { totalTokens: "desc" } },
    take: 20,
  })

  const userIds = top
    .map((row) => row.userId)
    .filter((id): id is string => Boolean(id))

  if (userIds.length === 0) {
    return []
  }

  const [users, counts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    }),
    prisma.aiUsage.groupBy({
      by: ["userId", "feature"],
      where: { ...where, userId: { in: userIds } },
      _count: { _all: true },
    }),
  ])

  const userById = new Map(users.map((user) => [user.id, user]))
  const countsByUser = new Map<string, { scanCount: number; chatCount: number }>()
  for (const row of counts) {
    if (!row.userId) continue
    const entry = countsByUser.get(row.userId) ?? { scanCount: 0, chatCount: 0 }
    if (SCAN_FEATURES.has(row.feature)) {
      entry.scanCount += row._count._all
    } else {
      entry.chatCount += row._count._all
    }
    countsByUser.set(row.userId, entry)
  }

  return top
    .filter((row): row is typeof row & { userId: string } => Boolean(row.userId))
    .map((row) => ({
      userId: row.userId,
      name: userById.get(row.userId)?.name ?? "Unknown",
      email: userById.get(row.userId)?.email ?? "",
      scanCount: countsByUser.get(row.userId)?.scanCount ?? 0,
      chatCount: countsByUser.get(row.userId)?.chatCount ?? 0,
      tokens: toBreakdown(row._sum),
    }))
}

async function fetchPerFeature(
  where: Prisma.AiUsageWhereInput,
): Promise<FeatureUsageRow[]> {
  const grouped = await prisma.aiUsage.groupBy({
    by: ["feature"],
    where,
    _sum: SUM_SELECT,
    _count: { _all: true },
  })

  return grouped
    .map((row) => ({
      feature: row.feature,
      callCount: row._count._all,
      tokens: toBreakdown(row._sum),
    }))
    .sort((a, b) => b.tokens.estimatedCostMicros - a.tokens.estimatedCostMicros)
}

async function getScanAllowanceStats(start: Date | null) {
  const dateFilter = start ? { gte: start } : undefined

  const [granted, used] = await Promise.all([
    prisma.scanLedger.aggregate({
      where: { delta: { gt: 0 }, createdAt: dateFilter },
      _sum: { delta: true },
    }),
    prisma.scanLedger.aggregate({
      where: { delta: { lt: 0 }, reason: "scan_debit", createdAt: dateFilter },
      _sum: { delta: true },
    }),
  ])

  return {
    scansGranted: granted._sum.delta ?? 0,
    scansUsed: Math.abs(used._sum.delta ?? 0),
  }
}

async function getTodayHighlights(): Promise<
  Pick<UsageHighlights, "scansToday" | "chatsToday">
> {
  const todayStart = startOfUtcDay(new Date())

  const [scansToday, chatsToday] = await Promise.all([
    prisma.scanLedger.count({
      where: { reason: "scan_debit", createdAt: { gte: todayStart } },
    }),
    prisma.aiUsage.count({
      where: { feature: "chat_reply", createdAt: { gte: todayStart } },
    }),
  ])

  return { scansToday, chatsToday }
}

/** The per-tier chat token grants, resolved once so derivations stay pure. */
function chatTokenGrants() {
  return {
    starter: getChatTokensPerScanForTier("starter"),
    plus: getChatTokensPerScanForTier("plus"),
    pro: getChatTokensPerScanForTier("pro"),
  }
}

export const getAdminUsageAnalytics = cache(
  async (input: UsageFilters = {}): Promise<AdminUsageAnalytics> => {
    await connection()

    const filters = resolveFilters(input)

    return withDbRetry(async () => {
      const where = buildWhere(filters)

      const [
        totals,
        chatCount,
        tokenSeries,
        perUser,
        perFeature,
        allowance,
        highlightsToday,
        fetched,
      ] = await Promise.all([
        prisma.aiUsage.aggregate({ where, _sum: SUM_SELECT }),
        prisma.aiUsage.count({ where: { ...where, feature: "chat_reply" } }),
        fetchTimeSeries(filters),
        fetchPerUser(where),
        fetchPerFeature(where),
        getScanAllowanceStats(getPeriodStart(filters.period)),
        getTodayHighlights(),
        getAdminEconomics(filters),
      ])

      const tokens = toBreakdown(totals._sum)
      const perModel = await fetchPerModel(where, tokens.totalTokens)

      const costSeries = tokenSeries.map((bucket) => ({
        label: bucket.label,
        value: microsToUsd(bucket.costMicros),
      }))

      const costPerScanSeries = tokenSeries.map((bucket) => ({
        label: bucket.label,
        value: microsToUsd(bucket.costPerScanMicros ?? 0),
      }))

      const economics = deriveUnitEconomics({
        filters,
        fetched,
        tokens,
        perFeature,
        perModel,
        scansUsed: allowance.scansUsed,
        chatTokenGrants: chatTokenGrants(),
        targetMarginPercent: getTargetMarginBps() / 100,
        simulatedPayments: isSimulatedProvider(),
        currency: fetched.currency,
      })

      return {
        filters,
        tokens,
        scansGranted: allowance.scansGranted,
        scansUsed: allowance.scansUsed,
        chatCount,
        tokenSeries,
        costSeries,
        costPerScanSeries,
        perModel,
        perUser,
        perFeature,
        highlights: {
          ...highlightsToday,
          mostActiveUser: perUser[0] ?? null,
          mostUsedModel: perModel[0] ?? null,
        },
        economics,
      }
    })
  },
)

export const getAdminUsageSnapshot = cache(async () => {
  await connection()
  return withDbRetry(async () => {
    const todayStart = startOfUtcDay(new Date())
    const allTimeFilters = resolveFilters({ period: "all" })

    const [allTime, allowance, scansToday, chatsToday, recentSeries, fetched] =
      await Promise.all([
        prisma.aiUsage.aggregate({ _sum: SUM_SELECT }),
        getScanAllowanceStats(null),
        prisma.scanLedger.count({
          where: { reason: "scan_debit", createdAt: { gte: todayStart } },
        }),
        prisma.aiUsage.count({
          where: { feature: "chat_reply", createdAt: { gte: todayStart } },
        }),
        fetchTimeSeries({ period: "30d", modelId: "", source: "all" }),
        getAdminEconomics(allTimeFilters),
      ])

    const allTimeTokens = toBreakdown(allTime._sum)

    const tokenSeries14 = recentSeries.slice(-14)
    const costSeries14 = tokenSeries14.map((bucket) => ({
      label: bucket.label,
      value: microsToUsd(bucket.costMicros),
    }))

    const revenueMicros = fetched.revenueByTier.reduce(
      (sum, row) => sum + row.amountCents * 10_000,
      0,
    )
    const grossMarginMicros = revenueMicros - allTimeTokens.estimatedCostMicros
    const grossMarginPercent = perUnit(grossMarginMicros, revenueMicros)

    return {
      allTimeTokens,
      scansGranted: allowance.scansGranted,
      scansUsed: allowance.scansUsed,
      scansToday,
      chatsToday,
      tokenSeries14,
      costSeries14,
      /** All-time loaded cost of one scan credit, in micro-USD. */
      costPerScanLoadedMicros: perUnit(
        allTimeTokens.estimatedCostMicros,
        allowance.scansUsed,
      ),
      revenueMicros,
      grossMarginPercent:
        grossMarginPercent === null ? null : grossMarginPercent * 100,
      simulatedPayments: isSimulatedProvider(),
    }
  })
})
