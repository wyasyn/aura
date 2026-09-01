import { cache } from "react"

import { prisma } from "@/lib/db/client"

export const getMyAffiliateProfile = cache(async (userId: string) => {
  return prisma.affiliateProfile.findUnique({ where: { userId } })
})

const DEFAULT_AFFILIATE_SETTINGS = {
  id: "global",
  commissionRateBps: 1000,
  customerDiscountBps: 1000,
}

/**
 * Pure read — the singleton row is seeded by migration, not written here.
 * An upsert-on-read previously lived here, but Prisma's upsert runs as an
 * interactive transaction (a random transaction id is generated before any
 * request-scoped data is read), which Next's Cache Components build step
 * flags as an error for a page that's otherwise eligible for static
 * prerendering. Falls back to in-memory defaults if the seed row is somehow
 * missing, rather than writing during a render.
 */
export const getAffiliateSettings = cache(async () => {
  const settings = await prisma.affiliateSettings.findUnique({ where: { id: "global" } })
  return settings ?? { ...DEFAULT_AFFILIATE_SETTINGS, updatedAt: new Date() }
})

export async function getAffiliateDashboardData(userId: string) {
  const profile = await prisma.affiliateProfile.findUnique({
    where: { userId },
    include: {
      orders: { orderBy: { placedAt: "desc" } },
      payouts: { orderBy: { paidAt: "desc" } },
    },
  })
  if (!profile) return null

  const earnedCents = profile.orders
    .filter((order) => order.status === "confirmed")
    .reduce((sum, order) => sum + order.commissionAmountCents, 0)
  const paidCents = profile.payouts.reduce((sum, payout) => sum + payout.amountCents, 0)

  return {
    profile,
    earnedCents,
    paidCents,
    owedCents: earnedCents - paidCents,
  }
}
