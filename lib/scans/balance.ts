import type { Prisma, ScanLedgerReason, ScanTier } from "@/generated/prisma/client"

import { prisma } from "@/lib/db/client"
import { chatTokensForScanGrant } from "@/lib/chat/token-budget"
import { getUserScanTier } from "@/lib/models/queries"

type GrantInput = {
  userId: string
  amount: number
  reason: ScanLedgerReason
  tier?: ScanTier
  grantedById?: string
  scanId?: string
  packId?: string
  metadata?: Prisma.InputJsonValue
  replaceBalance?: boolean
}

type DebitInput = {
  userId: string
  reason: ScanLedgerReason
  tier?: ScanTier
  scanId?: string
  metadata?: Prisma.InputJsonValue
}

async function resolveTier(userId: string, tier?: ScanTier): Promise<ScanTier> {
  return tier ?? (await getUserScanTier(userId))
}

export async function ensureScanBalance(userId: string) {
  return prisma.scanBalance.upsert({
    where: { userId },
    create: { userId, remaining: 0 },
    update: {},
  })
}

export async function getScansRemaining(userId: string): Promise<number> {
  const balance = await ensureScanBalance(userId)
  return balance.remaining
}

export async function grantScans(input: GrantInput) {
  if (input.amount <= 0) {
    throw new Error("Grant amount must be positive")
  }

  const tier = await resolveTier(input.userId, input.tier)
  const tokenGrant = chatTokensForScanGrant(input.amount, tier)

  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const balance = await tx.scanBalance.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        remaining: input.amount,
        lifetimeGranted: input.amount,
        periodGranted: input.amount,
        periodStartedAt: now,
        tokenBudgetRemaining: tokenGrant,
      },
      update: input.replaceBalance
        ? {
            // A replacing grant starts a new plan period, so usage counts
            // restart from zero while lifetime totals keep accumulating.
            remaining: input.amount,
            lifetimeGranted: { increment: input.amount },
            periodUsed: 0,
            periodGranted: input.amount,
            periodStartedAt: now,
            tokenBudgetRemaining: tokenGrant,
          }
        : {
            remaining: { increment: input.amount },
            lifetimeGranted: { increment: input.amount },
            periodGranted: { increment: input.amount },
            tokenBudgetRemaining: { increment: tokenGrant },
          },
    })

    await tx.scanLedger.create({
      data: {
        userId: input.userId,
        delta: input.amount,
        reason: input.reason,
        tier,
        grantedById: input.grantedById,
        scanId: input.scanId,
        packId: input.packId,
        metadata: input.metadata ?? undefined,
      },
    })

    return balance
  })
}

export async function grantPackScans(input: {
  userId: string
  packId: string
  grantedById?: string
  metadata?: Prisma.InputJsonValue
}) {
  const pack = await prisma.scanPack.findUnique({ where: { id: input.packId } })
  if (!pack || !pack.isActive) {
    throw new Error("Scan pack not found or inactive")
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { scanTier: pack.tier },
  })

  return grantScans({
    userId: input.userId,
    amount: pack.scanCount,
    reason: "pack_grant",
    tier: pack.tier,
    packId: pack.id,
    grantedById: input.grantedById,
    replaceBalance: true,
    metadata: input.metadata ?? {
      packLabel: pack.label,
      priceCents: pack.priceCents,
    },
  })
}

async function debitScanWithClient(
  tx: Prisma.TransactionClient,
  input: DebitInput,
) {
  const tier = await resolveTier(input.userId, input.tier)

  const balance = await tx.scanBalance.findUnique({
    where: { userId: input.userId },
  })
  if (!balance || balance.remaining < 1) {
    throw new Error("Insufficient scan balance")
  }

  const updated = await tx.scanBalance.update({
    where: { userId: input.userId },
    data: {
      remaining: { decrement: 1 },
      lifetimeUsed: { increment: 1 },
      periodUsed: { increment: 1 },
    },
  })

  await tx.scanLedger.create({
    data: {
      userId: input.userId,
      delta: -1,
      reason: input.reason,
      tier,
      scanId: input.scanId,
      metadata: input.metadata ?? undefined,
    },
  })

  return updated
}

export async function debitScanInTransaction(
  tx: Prisma.TransactionClient,
  input: DebitInput,
) {
  return debitScanWithClient(tx, input)
}

export async function debitScan(input: DebitInput) {
  return prisma.$transaction((tx) => debitScanWithClient(tx, input))
}
