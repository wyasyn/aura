/**
 * The five aggregates the unit-economics derivations need but the existing
 * usage queries do not produce: distinct entity counts, realised revenue,
 * unredeemed credit liability, failed-scan leakage, and latency percentiles.
 *
 * Distinct counts, percentiles and the cross-table join are not expressible
 * through Prisma's aggregate API, so they run as raw SQL sharing `buildRawWhere`
 * with the rest of the dashboard. Everything is fetched in one `Promise.all` and
 * is called from inside `getAdminUsageAnalytics`'s own `Promise.all`, so this
 * adds no extra round trip to the page.
 */

import { Prisma, type AiUsageFeature, type ScanTier } from "@/generated/prisma/client"
import { getPeriodStart } from "@/lib/admin/periods"
import {
  buildRawWhere,
  toNullableNumber,
  toNumber,
  type ResolvedUsageFilters,
} from "@/lib/admin/usage-shared"
import { prisma } from "@/lib/db/client"
import { getPaymentCurrency } from "@/lib/payments"

const MS_PER_DAY = 86_400_000

/**
 * Projections built from a few hours of data are noise. Clamping the divisor to
 * a day keeps the run rate conservative rather than wildly extrapolated.
 */
const MIN_ELAPSED_DAYS = 1

export type EconomicsCounts = {
  /** Distinct scans that produced at least one provider call. */
  scans: number
  conversations: number
  activeUsers: number
  totalCalls: number
  /** Calls with no `estimatedCostMicros`, i.e. no active rate for the model. */
  unpricedCalls: number
  /** Days of data actually observed in the window, floored at one. */
  elapsedDays: number | null
}

export type TierRevenueRow = {
  tier: ScanTier
  amountCents: number
  scanCount: number
  paymentCount: number
}

export type LatencyRow = {
  feature: AiUsageFeature
  p50Ms: number | null
  p95Ms: number | null
  sampleCount: number
}

export type EconomicsFetch = {
  counts: EconomicsCounts
  revenueByTier: TierRevenueRow[]
  liability: { unredeemedScans: number; unredeemedChatTokens: number }
  failedScans: { count: number; costMicros: number }
  latency: LatencyRow[]
  currency: string
}

type CountsRow = {
  scans: bigint | number | string | null
  conversations: bigint | number | string | null
  users: bigint | number | string | null
  calls: bigint | number | string | null
  unpriced: bigint | number | string | null
  earliest: Date | null
}

async function fetchCounts(
  filters: ResolvedUsageFilters,
): Promise<EconomicsCounts> {
  const where = buildRawWhere(filters)

  const [row] = await prisma.$queryRaw<CountsRow[]>(Prisma.sql`
    SELECT
      COUNT(DISTINCT "scanId") AS scans,
      COUNT(DISTINCT "conversationId") AS conversations,
      COUNT(DISTINCT "userId") AS users,
      COUNT(*) AS calls,
      COUNT(*) FILTER (WHERE "estimatedCostMicros" IS NULL) AS unpriced,
      MIN("createdAt") AS earliest
    FROM "ai_usage"
    ${where}
  `)

  const earliest = row?.earliest ?? null
  const elapsedDays = earliest
    ? Math.max((Date.now() - earliest.getTime()) / MS_PER_DAY, MIN_ELAPSED_DAYS)
    : null

  return {
    scans: toNumber(row?.scans),
    conversations: toNumber(row?.conversations),
    activeUsers: toNumber(row?.users),
    totalCalls: toNumber(row?.calls),
    unpricedCalls: toNumber(row?.unpriced),
    elapsedDays,
  }
}

/**
 * Realised revenue. Deliberately ignores the model and source filters, which
 * describe provider calls and have no meaning for payments; the dashboard only
 * renders the margin section when neither filter is active.
 */
async function fetchRevenue(
  filters: ResolvedUsageFilters,
  currency: string,
): Promise<TierRevenueRow[]> {
  const start = getPeriodStart(filters.period)

  const grouped = await prisma.payment.groupBy({
    by: ["tier"],
    where: {
      status: "succeeded",
      currency,
      ...(start ? { paidAt: { gte: start } } : {}),
    },
    _sum: { amountCents: true, scanCount: true },
    _count: true,
  })

  return grouped.map((row) => ({
    tier: row.tier,
    amountCents: row._sum.amountCents ?? 0,
    scanCount: row._sum.scanCount ?? 0,
    paymentCount: row._count,
  }))
}

/**
 * Credits paid for but not yet spent. A balance, not a flow, so it is never
 * period-filtered.
 */
async function fetchLiability() {
  const totals = await prisma.scanBalance.aggregate({
    _sum: { remaining: true, tokenBudgetRemaining: true },
  })

  return {
    unredeemedScans: totals._sum.remaining ?? 0,
    unredeemedChatTokens: toNumber(totals._sum.tokenBudgetRemaining),
  }
}

type FailedScanRow = {
  scans: bigint | number | string | null
  cost: bigint | number | string | null
}

/**
 * Spend on scans that never produced a result. `ai_usage.scanId` carries no
 * foreign key (so spend history survives scan deletion) but is indexed, so the
 * join is cheap.
 */
async function fetchFailedScans(filters: ResolvedUsageFilters) {
  const where = buildRawWhere(filters, {
    alias: "u",
    extra: [Prisma.sql`s."status"::text IN ('failed', 'cancelled')`],
  })

  const [row] = await prisma.$queryRaw<FailedScanRow[]>(Prisma.sql`
    SELECT
      COUNT(DISTINCT u."scanId") AS scans,
      SUM(COALESCE(u."estimatedCostMicros", 0)) AS cost
    FROM "ai_usage" u
    JOIN "scan" s ON s."id" = u."scanId"
    ${where}
  `)

  return { count: toNumber(row?.scans), costMicros: toNumber(row?.cost) }
}

type LatencySqlRow = {
  feature: string
  p50: number | string | null
  p95: number | string | null
  samples: bigint | number | string | null
}

async function fetchLatency(
  filters: ResolvedUsageFilters,
): Promise<LatencyRow[]> {
  const where = buildRawWhere(filters, {
    extra: [Prisma.sql`"latencyMs" IS NOT NULL`],
  })

  const rows = await prisma.$queryRaw<LatencySqlRow[]>(Prisma.sql`
    SELECT
      "feature"::text AS feature,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS p95,
      COUNT(*) AS samples
    FROM "ai_usage"
    ${where}
    GROUP BY 1
    ORDER BY 4 DESC
  `)

  return rows.map((row) => ({
    feature: row.feature as AiUsageFeature,
    p50Ms: toNullableNumber(row.p50),
    p95Ms: toNullableNumber(row.p95),
    sampleCount: toNumber(row.samples),
  }))
}

export async function getAdminEconomics(
  filters: ResolvedUsageFilters,
): Promise<EconomicsFetch> {
  const currency = getPaymentCurrency()

  const [counts, revenueByTier, liability, failedScans, latency] =
    await Promise.all([
      fetchCounts(filters),
      fetchRevenue(filters, currency),
      fetchLiability(),
      fetchFailedScans(filters),
      fetchLatency(filters),
    ])

  return { counts, revenueByTier, liability, failedScans, latency, currency }
}
