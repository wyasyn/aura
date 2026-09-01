import { cache } from "react"

import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export const getBillingProfile = cache(async (userId: string) => {
  return withDbRetry(() =>
    prisma.billingProfile.findUnique({ where: { userId } }),
  )
})

export const getBillingSummary = cache(async (userId: string) => {
  const [user, balance] = await withDbRetry(() =>
    Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { scanTier: true },
      }),
      prisma.scanBalance.findUnique({
        where: { userId },
        select: {
          remaining: true,
          lifetimeUsed: true,
          lifetimeGranted: true,
          periodUsed: true,
          periodGranted: true,
          periodStartedAt: true,
        },
      }),
    ]),
  )

  return {
    tier: user?.scanTier ?? "starter",
    remaining: balance?.remaining ?? 0,
    lifetimeUsed: balance?.lifetimeUsed ?? 0,
    lifetimeGranted: balance?.lifetimeGranted ?? 0,
    /** Usage since the current plan started, reset by each pack purchase. */
    periodUsed: balance?.periodUsed ?? 0,
    periodGranted: balance?.periodGranted ?? 0,
    periodStartedAt: balance?.periodStartedAt ?? null,
  }
})

export const listUserPayments = cache(async (userId: string, take = 25) => {
  return withDbRetry(() =>
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        receiptNumber: true,
        status: true,
        amountCents: true,
        currency: true,
        tier: true,
        scanCount: true,
        cardBrand: true,
        cardLast4: true,
        failureReason: true,
        paidAt: true,
        createdAt: true,
        pack: { select: { label: true } },
      },
    }),
  )
})

export type UserPayment = Awaited<ReturnType<typeof listUserPayments>>[number]
