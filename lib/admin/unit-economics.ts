/**
 * Unit economics for the admin analytics dashboard.
 *
 * The usage dashboard answers "how much did we spend"; this module answers
 * "what does one scan cost, what does one chat turn cost, and does the pack
 * price cover it". Everything here is a pure derivation over aggregates that
 * `lib/admin/usage-analytics.ts` has already fetched, plus the extra counts
 * gathered by `lib/admin/economics-queries.ts`. No database access, so the
 * arithmetic is directly testable.
 *
 * Costs are in micro-USD throughout, matching `AiUsage.estimatedCostMicros`.
 * Every per-unit value is `null` rather than `0` when its denominator is empty:
 * a $0.00 cost-per-scan is a wrong answer, not an absent one.
 */

import type {
  AiUsageFeature,
  ScanTier,
} from "@/generated/prisma/client"
import {
  CHAT_FEATURES,
  SCAN_FEATURES,
  sourceCovers,
  type ResolvedUsageFilters,
  type TokenBreakdown,
} from "@/lib/admin/usage-shared"
import type { EconomicsFetch } from "@/lib/admin/economics-queries"

const MICROS_PER_CENT = 10_000
const PROJECTION_DAYS = 30

/** Ordered so the tier tables always read cheapest plan first. */
const TIER_ORDER: ScanTier[] = ["starter", "plus", "pro"]

export type FeatureAggregate = {
  feature: AiUsageFeature
  callCount: number
  tokens: TokenBreakdown
}

/** Structural shape of `ModelUsageRow`; kept loose to avoid an import cycle. */
export type ModelAggregate = {
  modelId: string
  displayName: string | null
  assignedTier: string | null
  scanCount: number
  chatCount: number
  scanTokens: TokenBreakdown
  chatTokens: TokenBreakdown
}

export type UnitCosts = {
  /** Scan-feature cost divided by distinct scans seen in the window. */
  costPerScanDirect: number | null
  /**
   * Every provider call in the window divided by scan credits debited. A credit
   * entitles chat, so chat, guardrail and transcription amortise onto it. This
   * is the number that gets compared against pack revenue.
   */
  costPerScanLoaded: number | null
  costPerChatReply: number | null
  /** A visible reply also pays for its guardrail and recommendation passes. */
  costPerChatTurnLoaded: number | null
  costPerConversation: number | null
  costPerActiveUser: number | null
  tokensPerScan: number | null
  tokensPerChatReply: number | null
  tokensPerConversation: number | null
  chatRepliesPerScan: number | null
  chatTokensPerScan: number | null
  /** False when the source filter excludes scan (or chat) rows entirely. */
  scanApplicable: boolean
  chatApplicable: boolean
  /** Loaded costs only mean anything over an unfiltered window. */
  loadedApplicable: boolean
}

export type ChatBudgetRow = {
  tier: ScanTier
  grantedTokensPerScan: number
  actualTokensPerScan: number | null
  utilizationPercent: number | null
}

export type RevenueSummary = {
  /** True while `PAYMENT_PROVIDER` is the mock driver. */
  simulated: boolean
  currency: string
  revenueMicros: number
  scansSold: number
  paymentCount: number
  providerCostMicros: number
  grossMarginMicros: number
  grossMarginPercent: number | null
  targetMarginPercent: number
  revenuePerScanMicros: number | null
}

export type TierEconomicsRow = {
  tier: string
  scanCalls: number
  chatCalls: number
  costPerScanDirect: number | null
  costPerScanLoaded: number | null
  revenuePerScanMicros: number | null
  contributionMicros: number | null
  marginPercent: number | null
}

export type PlanningSummary = {
  elapsedDays: number | null
  dailyCostMicros: number | null
  projectedCostMicros: number | null
  projectionDays: number
  unredeemedScans: number
  unredeemedChatTokens: number
  /** Cost already sold but not yet incurred: credits x loaded cost per scan. */
  estimatedLiabilityMicros: number | null
}

export type LatencySummary = {
  feature: AiUsageFeature
  p50Ms: number | null
  p95Ms: number | null
  sampleCount: number
}

export type OpsSummary = {
  latency: LatencySummary[]
  failedScanCount: number
  failedScanCostMicros: number
  /** Share of calls that resolved to a priced `AiModelRate`. */
  costCoveragePercent: number | null
  unpricedCalls: number
}

export type AdminEconomics = {
  counts: EconomicsFetch["counts"]
  unit: UnitCosts
  chatBudget: ChatBudgetRow[]
  revenue: RevenueSummary
  tiers: TierEconomicsRow[]
  planning: PlanningSummary
  ops: OpsSummary
}

export type DeriveInput = {
  filters: ResolvedUsageFilters
  fetched: EconomicsFetch
  /** Totals across the whole filtered window. */
  tokens: TokenBreakdown
  perFeature: FeatureAggregate[]
  perModel: ModelAggregate[]
  /** Scan credits debited from `scan_ledger` over the same period. */
  scansUsed: number
  /** Per-tier chat token grant, from `getChatTokensPerScanForTier`. */
  chatTokenGrants: Record<ScanTier, number>
  /** `getTargetMarginBps() / 100`. */
  targetMarginPercent: number
  simulatedPayments: boolean
  currency: string
}

/**
 * Divides only when the denominator is real. Returns `null` for an empty
 * denominator so callers can render an em-dash instead of a confident zero.
 */
export function perUnit(total: number, count: number): number | null {
  if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) {
    return null
  }
  return total / count
}

function percentOf(part: number, whole: number): number | null {
  const ratio = perUnit(part, whole)
  return ratio === null ? null : ratio * 100
}

function sumFeatures(
  perFeature: FeatureAggregate[],
  group: Set<AiUsageFeature>,
): { costMicros: number; totalTokens: number; callCount: number } {
  return perFeature.reduce(
    (acc, row) => {
      if (!group.has(row.feature)) return acc
      return {
        costMicros: acc.costMicros + row.tokens.estimatedCostMicros,
        totalTokens: acc.totalTokens + row.tokens.totalTokens,
        callCount: acc.callCount + row.callCount,
      }
    },
    { costMicros: 0, totalTokens: 0, callCount: 0 },
  )
}

function findFeature(
  perFeature: FeatureAggregate[],
  feature: AiUsageFeature,
): FeatureAggregate | undefined {
  return perFeature.find((row) => row.feature === feature)
}

function deriveUnitCosts(input: DeriveInput): UnitCosts {
  const { filters, fetched, tokens, perFeature, scansUsed } = input

  const scan = sumFeatures(perFeature, SCAN_FEATURES)
  const chatLoaded = sumFeatures(perFeature, CHAT_FEATURES)
  const chatReply = findFeature(perFeature, "chat_reply")
  const chatReplyCount = chatReply?.callCount ?? 0

  const scanApplicable = sourceCovers(filters.source, SCAN_FEATURES)
  const chatApplicable = sourceCovers(filters.source, CHAT_FEATURES)
  // A model or source filter shrinks the numerator but not the credits
  // debited, which would make a loaded cost read far cheaper than it is.
  const loadedApplicable = filters.source === "all" && filters.modelId === ""

  return {
    costPerScanDirect: scanApplicable
      ? perUnit(scan.costMicros, fetched.counts.scans)
      : null,
    costPerScanLoaded: loadedApplicable
      ? perUnit(tokens.estimatedCostMicros, scansUsed)
      : null,
    costPerChatReply: chatApplicable
      ? perUnit(chatReply?.tokens.estimatedCostMicros ?? 0, chatReplyCount)
      : null,
    costPerChatTurnLoaded: chatApplicable
      ? perUnit(chatLoaded.costMicros, chatReplyCount)
      : null,
    costPerConversation: chatApplicable
      ? perUnit(chatLoaded.costMicros, fetched.counts.conversations)
      : null,
    costPerActiveUser: perUnit(
      tokens.estimatedCostMicros,
      fetched.counts.activeUsers,
    ),
    tokensPerScan: scanApplicable
      ? perUnit(scan.totalTokens, fetched.counts.scans)
      : null,
    tokensPerChatReply: chatApplicable
      ? perUnit(chatReply?.tokens.totalTokens ?? 0, chatReplyCount)
      : null,
    tokensPerConversation: chatApplicable
      ? perUnit(chatLoaded.totalTokens, fetched.counts.conversations)
      : null,
    chatRepliesPerScan:
      loadedApplicable || (scanApplicable && chatApplicable)
        ? perUnit(chatReplyCount, scansUsed)
        : null,
    chatTokensPerScan: chatApplicable
      ? perUnit(chatLoaded.totalTokens, scansUsed)
      : null,
    scanApplicable,
    chatApplicable,
    loadedApplicable,
  }
}

type TierAggregate = {
  scanCalls: number
  chatCalls: number
  scanCostMicros: number
  chatCostMicros: number
  chatTokens: number
}

function aggregateByTier(perModel: ModelAggregate[]): Map<string, TierAggregate> {
  const byTier = new Map<string, TierAggregate>()

  for (const row of perModel) {
    // Attribution follows the model's *current* assignedTier, so reassigning a
    // model shifts historical rows. Called out in the dashboard copy.
    const tier = row.assignedTier ?? "unassigned"
    const entry = byTier.get(tier) ?? {
      scanCalls: 0,
      chatCalls: 0,
      scanCostMicros: 0,
      chatCostMicros: 0,
      chatTokens: 0,
    }

    entry.scanCalls += row.scanCount
    entry.chatCalls += row.chatCount
    entry.scanCostMicros += row.scanTokens.estimatedCostMicros
    entry.chatCostMicros += row.chatTokens.estimatedCostMicros
    entry.chatTokens += row.chatTokens.totalTokens

    byTier.set(tier, entry)
  }

  return byTier
}

function deriveRevenue(input: DeriveInput): RevenueSummary {
  const { fetched, tokens, targetMarginPercent } = input

  const revenueMicros = fetched.revenueByTier.reduce(
    (sum, row) => sum + row.amountCents * MICROS_PER_CENT,
    0,
  )
  const scansSold = fetched.revenueByTier.reduce(
    (sum, row) => sum + row.scanCount,
    0,
  )
  const paymentCount = fetched.revenueByTier.reduce(
    (sum, row) => sum + row.paymentCount,
    0,
  )

  const providerCostMicros = tokens.estimatedCostMicros
  const grossMarginMicros = revenueMicros - providerCostMicros

  return {
    simulated: input.simulatedPayments,
    currency: input.currency,
    revenueMicros,
    scansSold,
    paymentCount,
    providerCostMicros,
    grossMarginMicros,
    grossMarginPercent: percentOf(grossMarginMicros, revenueMicros),
    targetMarginPercent,
    revenuePerScanMicros: perUnit(revenueMicros, scansSold),
  }
}

function deriveTiers(input: DeriveInput): TierEconomicsRow[] {
  const byTier = aggregateByTier(input.perModel)

  const revenueByTier = new Map(
    input.fetched.revenueByTier.map((row) => [row.tier as string, row]),
  )

  const tiers = [...new Set([...byTier.keys(), ...revenueByTier.keys()])].sort(
    (a, b) => {
      const ai = TIER_ORDER.indexOf(a as ScanTier)
      const bi = TIER_ORDER.indexOf(b as ScanTier)
      return (ai < 0 ? TIER_ORDER.length : ai) - (bi < 0 ? TIER_ORDER.length : bi)
    },
  )

  return tiers.map((tier) => {
    const usage = byTier.get(tier)
    const revenue = revenueByTier.get(tier)

    const scanCalls = usage?.scanCalls ?? 0
    const loadedCost = (usage?.scanCostMicros ?? 0) + (usage?.chatCostMicros ?? 0)

    const costPerScanDirect = perUnit(usage?.scanCostMicros ?? 0, scanCalls)
    const costPerScanLoaded = perUnit(loadedCost, scanCalls)
    const revenuePerScanMicros = revenue
      ? perUnit(revenue.amountCents * MICROS_PER_CENT, revenue.scanCount)
      : null

    const contributionMicros =
      revenuePerScanMicros === null || costPerScanLoaded === null
        ? null
        : revenuePerScanMicros - costPerScanLoaded

    return {
      tier,
      scanCalls,
      chatCalls: usage?.chatCalls ?? 0,
      costPerScanDirect,
      costPerScanLoaded,
      revenuePerScanMicros,
      contributionMicros,
      marginPercent:
        contributionMicros === null || revenuePerScanMicros === null
          ? null
          : percentOf(contributionMicros, revenuePerScanMicros),
    }
  })
}

function deriveChatBudget(input: DeriveInput): ChatBudgetRow[] {
  const byTier = aggregateByTier(input.perModel)

  return TIER_ORDER.map((tier) => {
    const usage = byTier.get(tier)
    const grantedTokensPerScan = input.chatTokenGrants[tier]
    const actualTokensPerScan = perUnit(
      usage?.chatTokens ?? 0,
      usage?.scanCalls ?? 0,
    )

    return {
      tier,
      grantedTokensPerScan,
      actualTokensPerScan,
      utilizationPercent:
        actualTokensPerScan === null
          ? null
          : percentOf(actualTokensPerScan, grantedTokensPerScan),
    }
  })
}

function derivePlanning(input: DeriveInput, unit: UnitCosts): PlanningSummary {
  const { fetched, tokens } = input
  const elapsedDays = fetched.counts.elapsedDays

  const dailyCostMicros = perUnit(tokens.estimatedCostMicros, elapsedDays ?? 0)
  const projectedCostMicros =
    dailyCostMicros === null ? null : dailyCostMicros * PROJECTION_DAYS

  return {
    elapsedDays,
    dailyCostMicros,
    projectedCostMicros,
    projectionDays: PROJECTION_DAYS,
    unredeemedScans: fetched.liability.unredeemedScans,
    unredeemedChatTokens: fetched.liability.unredeemedChatTokens,
    estimatedLiabilityMicros:
      unit.costPerScanLoaded === null
        ? null
        : unit.costPerScanLoaded * fetched.liability.unredeemedScans,
  }
}

function deriveOps(input: DeriveInput): OpsSummary {
  const { fetched } = input
  const { totalCalls, unpricedCalls } = fetched.counts

  return {
    latency: fetched.latency,
    failedScanCount: fetched.failedScans.count,
    failedScanCostMicros: fetched.failedScans.costMicros,
    costCoveragePercent: percentOf(totalCalls - unpricedCalls, totalCalls),
    unpricedCalls,
  }
}

export function deriveUnitEconomics(input: DeriveInput): AdminEconomics {
  const unit = deriveUnitCosts(input)

  return {
    counts: input.fetched.counts,
    unit,
    chatBudget: deriveChatBudget(input),
    revenue: deriveRevenue(input),
    tiers: deriveTiers(input),
    planning: derivePlanning(input, unit),
    ops: deriveOps(input),
  }
}
