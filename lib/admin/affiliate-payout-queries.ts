import { prisma } from "@/lib/db/client"

export async function listAffiliatesWithBalances() {
  const affiliates = await prisma.affiliateProfile.findMany({
    where: { status: "approved" },
    include: {
      user: { select: { name: true, email: true } },
      orders: { where: { status: "confirmed" }, select: { commissionAmountCents: true } },
      payouts: { select: { amountCents: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return affiliates.map((affiliate) => {
    const earnedCents = affiliate.orders.reduce(
      (sum, order) => sum + order.commissionAmountCents,
      0,
    )
    const paidCents = affiliate.payouts.reduce(
      (sum, payout) => sum + payout.amountCents,
      0,
    )

    return {
      id: affiliate.id,
      name: affiliate.user.name,
      email: affiliate.user.email,
      couponCode: affiliate.couponCode,
      orderCount: affiliate.orders.length,
      earnedCents,
      paidCents,
      owedCents: earnedCents - paidCents,
    }
  })
}
