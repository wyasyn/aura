import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  deriveUnitEconomics,
  perUnit,
  type DeriveInput,
  type FeatureAggregate,
  type ModelAggregate,
} from "@/lib/admin/unit-economics"
import type { EconomicsFetch } from "@/lib/admin/economics-queries"
import type { TokenBreakdown } from "@/lib/admin/usage-shared"

function breakdown(
  totalTokens: number,
  estimatedCostMicros: number,
): TokenBreakdown {
  return {
    inputTokens: totalTokens,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens,
    estimatedCostMicros,
  }
}

function emptyFetch(): EconomicsFetch {
  return {
    counts: {
      scans: 0,
      conversations: 0,
      activeUsers: 0,
      totalCalls: 0,
      unpricedCalls: 0,
      elapsedDays: null,
    },
    revenueByTier: [],
    liability: { unredeemedScans: 0, unredeemedChatTokens: 0 },
    failedScans: { count: 0, costMicros: 0 },
    latency: [],
    currency: "USD",
  }
}

function baseInput(overrides: Partial<DeriveInput> = {}): DeriveInput {
  return {
    filters: { period: "30d", modelId: "", source: "all" },
    fetched: emptyFetch(),
    tokens: breakdown(0, 0),
    perFeature: [],
    perModel: [],
    scansUsed: 0,
    chatTokenGrants: { starter: 40_000, plus: 60_000, pro: 80_000 },
    targetMarginPercent: 70,
    simulatedPayments: true,
    currency: "USD",
    ...overrides,
  }
}

/**
 * 10 scans costing $0.02 each, 40 chat replies costing $0.001 each plus 40
 * guardrail passes at $0.0001. Sized so every expected value is exact.
 */
function populatedInput(overrides: Partial<DeriveInput> = {}): DeriveInput {
  const perFeature: FeatureAggregate[] = [
    { feature: "scan_analyze", callCount: 10, tokens: breakdown(50_000, 200_000) },
    { feature: "chat_reply", callCount: 40, tokens: breakdown(60_000, 40_000) },
    { feature: "chat_guardrail", callCount: 40, tokens: breakdown(4_000, 4_000) },
  ]

  const perModel: ModelAggregate[] = [
    {
      modelId: "gemini-3.5-flash-lite",
      displayName: "Flash-Lite",
      assignedTier: "starter",
      scanCount: 10,
      chatCount: 80,
      scanTokens: breakdown(50_000, 200_000),
      chatTokens: breakdown(64_000, 44_000),
    },
  ]

  const fetched: EconomicsFetch = {
    ...emptyFetch(),
    counts: {
      scans: 10,
      conversations: 8,
      activeUsers: 4,
      totalCalls: 90,
      unpricedCalls: 9,
      elapsedDays: 10,
    },
    revenueByTier: [
      // Starter: 20 scans for $9.99, bought twice.
      { tier: "starter", amountCents: 1998, scanCount: 40, paymentCount: 2 },
    ],
    liability: { unredeemedScans: 30, unredeemedChatTokens: 1_200_000 },
    failedScans: { count: 1, costMicros: 20_000 },
  }

  return baseInput({
    fetched,
    tokens: breakdown(114_000, 244_000),
    perFeature,
    perModel,
    scansUsed: 10,
    ...overrides,
  })
}

describe("perUnit", () => {
  it("returns null rather than zero for an empty denominator", () => {
    assert.equal(perUnit(500, 0), null)
    assert.equal(perUnit(0, 0), null)
    assert.equal(perUnit(500, -3), null)
  })

  it("divides when the denominator is real", () => {
    assert.equal(perUnit(500, 4), 125)
    assert.equal(perUnit(0, 4), 0)
  })

  it("refuses non-finite inputs instead of propagating NaN", () => {
    assert.equal(perUnit(Number.NaN, 4), null)
    assert.equal(perUnit(5, Number.POSITIVE_INFINITY), null)
  })
})

describe("deriveUnitEconomics with no activity", () => {
  const result = deriveUnitEconomics(baseInput())

  it("blanks every per-unit cost instead of reporting zero", () => {
    const { unit } = result
    assert.equal(unit.costPerScanDirect, null)
    assert.equal(unit.costPerScanLoaded, null)
    assert.equal(unit.costPerChatReply, null)
    assert.equal(unit.costPerChatTurnLoaded, null)
    assert.equal(unit.costPerConversation, null)
    assert.equal(unit.costPerActiveUser, null)
    assert.equal(unit.tokensPerScan, null)
    assert.equal(unit.chatRepliesPerScan, null)
  })

  it("produces no NaN or Infinity anywhere in the result", () => {
    const flattened = JSON.stringify(result)
    assert.equal(flattened.includes("null"), true)
    assert.equal(flattened.includes("NaN"), false)
    assert.equal(flattened.includes("Infinity"), false)
  })

  it("blanks margin and liability without revenue or cost", () => {
    assert.equal(result.revenue.revenueMicros, 0)
    assert.equal(result.revenue.grossMarginPercent, null)
    assert.equal(result.revenue.revenuePerScanMicros, null)
    assert.equal(result.planning.projectedCostMicros, null)
    assert.equal(result.planning.estimatedLiabilityMicros, null)
    assert.equal(result.ops.costCoveragePercent, null)
  })

  it("still lists every tier in the chat budget table", () => {
    assert.deepEqual(
      result.chatBudget.map((row) => row.tier),
      ["starter", "plus", "pro"],
    )
    assert.equal(result.chatBudget[0].grantedTokensPerScan, 40_000)
    assert.equal(result.chatBudget[0].utilizationPercent, null)
  })
})

describe("deriveUnitEconomics unit costs", () => {
  const { unit } = deriveUnitEconomics(populatedInput())

  it("separates direct from loaded cost per scan", () => {
    // Direct: 200,000 micros of scan calls over 10 scans.
    assert.equal(unit.costPerScanDirect, 20_000)
    // Loaded: all 244,000 micros over the 10 credits debited.
    assert.equal(unit.costPerScanLoaded, 24_400)
  })

  it("charges a chat turn for its guardrail pass", () => {
    assert.equal(unit.costPerChatReply, 1_000)
    assert.equal(unit.costPerChatTurnLoaded, 1_100)
  })

  it("divides conversation and user costs by their own denominators", () => {
    assert.equal(unit.costPerConversation, 44_000 / 8)
    assert.equal(unit.costPerActiveUser, 244_000 / 4)
  })

  it("reports token averages alongside the costs", () => {
    assert.equal(unit.tokensPerScan, 5_000)
    assert.equal(unit.tokensPerChatReply, 1_500)
    assert.equal(unit.chatRepliesPerScan, 4)
    assert.equal(unit.chatTokensPerScan, 6_400)
  })
})

describe("deriveUnitEconomics filter applicability", () => {
  it("blanks scan metrics when the source filter excludes scans", () => {
    const { unit } = deriveUnitEconomics(
      populatedInput({
        filters: { period: "30d", modelId: "", source: "chat" },
      }),
    )

    assert.equal(unit.scanApplicable, false)
    assert.equal(unit.costPerScanDirect, null)
    assert.equal(unit.tokensPerScan, null)
    assert.equal(unit.chatApplicable, true)
    assert.notEqual(unit.costPerChatReply, null)
  })

  it("blanks chat metrics when the source filter excludes chat", () => {
    const { unit } = deriveUnitEconomics(
      populatedInput({
        filters: { period: "30d", modelId: "", source: "scan" },
      }),
    )

    assert.equal(unit.chatApplicable, false)
    assert.equal(unit.costPerChatReply, null)
    assert.equal(unit.costPerConversation, null)
    assert.notEqual(unit.costPerScanDirect, null)
  })

  it("blanks loaded cost whenever any filter narrows the window", () => {
    for (const filters of [
      { period: "30d" as const, modelId: "gemini-3.5-flash-lite", source: "all" as const },
      { period: "30d" as const, modelId: "", source: "scan" as const },
    ]) {
      const { unit } = deriveUnitEconomics(populatedInput({ filters }))
      assert.equal(unit.loadedApplicable, false)
      assert.equal(unit.costPerScanLoaded, null)
    }
  })
})

describe("deriveUnitEconomics revenue and tiers", () => {
  const result = deriveUnitEconomics(populatedInput())

  it("converts cents to micro-USD and computes gross margin", () => {
    // $19.98 in micros.
    assert.equal(result.revenue.revenueMicros, 19_980_000)
    assert.equal(result.revenue.scansSold, 40)
    assert.equal(result.revenue.paymentCount, 2)
    assert.equal(result.revenue.providerCostMicros, 244_000)
    assert.equal(result.revenue.grossMarginMicros, 19_736_000)
    assert.equal(
      result.revenue.grossMarginPercent,
      (19_736_000 / 19_980_000) * 100,
    )
    // $19.98 over 40 scans is $0.4995 each.
    assert.equal(result.revenue.revenuePerScanMicros, 499_500)
  })

  it("computes contribution per scan for the tier", () => {
    const starter = result.tiers.find((row) => row.tier === "starter")
    assert.ok(starter)
    assert.equal(starter.costPerScanDirect, 20_000)
    assert.equal(starter.costPerScanLoaded, 24_400)
    assert.equal(starter.revenuePerScanMicros, 499_500)
    assert.equal(starter.contributionMicros, 499_500 - 24_400)
    assert.equal(
      starter.marginPercent,
      ((499_500 - 24_400) / 499_500) * 100,
    )
  })

  it("orders tiers cheapest first and keeps unassigned models last", () => {
    const input = populatedInput()
    input.perModel = [
      { ...input.perModel[0], modelId: "unrated", assignedTier: null },
      { ...input.perModel[0], assignedTier: "pro" },
      { ...input.perModel[0], assignedTier: "starter" },
    ]

    assert.deepEqual(
      deriveUnitEconomics(input).tiers.map((row) => row.tier),
      ["starter", "pro", "unassigned"],
    )
  })

  it("leaves contribution null for a tier with usage but no sales", () => {
    const input = populatedInput()
    input.perModel = [{ ...input.perModel[0], assignedTier: "pro" }]

    const pro = deriveUnitEconomics(input).tiers.find(
      (row) => row.tier === "pro",
    )
    assert.ok(pro)
    assert.notEqual(pro.costPerScanLoaded, null)
    assert.equal(pro.revenuePerScanMicros, null)
    assert.equal(pro.contributionMicros, null)
    assert.equal(pro.marginPercent, null)
  })
})

describe("deriveUnitEconomics chat budget calibration", () => {
  it("measures actual chat tokens per scan against the tier grant", () => {
    const starter = deriveUnitEconomics(populatedInput()).chatBudget.find(
      (row) => row.tier === "starter",
    )
    assert.ok(starter)
    assert.equal(starter.actualTokensPerScan, 6_400)
    assert.equal(starter.grantedTokensPerScan, 40_000)
    assert.equal(starter.utilizationPercent, 16)
  })
})

describe("deriveUnitEconomics planning and ops", () => {
  const result = deriveUnitEconomics(populatedInput())

  it("projects spend from the observed daily run rate", () => {
    // 244,000 micros over 10 days of data.
    assert.equal(result.planning.dailyCostMicros, 24_400)
    assert.equal(result.planning.projectedCostMicros, 24_400 * 30)
    assert.equal(result.planning.projectionDays, 30)
  })

  it("values unredeemed credits at the loaded cost per scan", () => {
    assert.equal(result.planning.unredeemedScans, 30)
    assert.equal(result.planning.estimatedLiabilityMicros, 24_400 * 30)
  })

  it("reports the share of calls that resolved to a priced rate", () => {
    // 9 of 90 calls unpriced.
    assert.equal(result.ops.costCoveragePercent, 90)
    assert.equal(result.ops.unpricedCalls, 9)
    assert.equal(result.ops.failedScanCount, 1)
    assert.equal(result.ops.failedScanCostMicros, 20_000)
  })
})
