import { prisma } from "@/lib/db/client"
import { getFreeStarterScans } from "@/lib/onboarding/constants"
import { grantScans } from "@/lib/scans/balance"

export async function ensureUserRecords(userId: string, email: string, name?: string) {
  await Promise.all([
    prisma.userProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.userLocation.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.scanBalance.upsert({
      where: { userId },
      create: { userId, remaining: 0 },
      update: {},
    }),
  ])

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase()
  const updates: Promise<unknown>[] = []

  if (bootstrapEmail && email.toLowerCase() === bootstrapEmail) {
    updates.push(
      prisma.user.update({
        where: { id: userId },
        data: { role: "admin" },
      }),
    )
  }

  if (name) {
    updates.push(
      prisma.user.update({
        where: { id: userId },
        data: { name },
      }),
    )
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }
}

export async function grantFreeStarterScansIfNeeded(userId: string) {
  const existing = await prisma.scanLedger.findFirst({
    where: { userId, reason: "signup_bonus" },
  })
  if (existing) return

  await grantScans({
    userId,
    amount: getFreeStarterScans(),
    reason: "signup_bonus",
    tier: "starter",
    metadata: { note: "Free Starter scans" },
  })
}
