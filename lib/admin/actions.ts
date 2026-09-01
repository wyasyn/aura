"use server"

import { revalidatePath } from "next/cache"

import type { ScanTier } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/auth/session"
import { ASSIGNABLE_ROLES, type AppRole } from "@/lib/dashboard/nav"
import { SCAN_TIERS } from "@/lib/models/types"
import { scanGrantSchema } from "@/lib/onboarding/schemas"
import { prisma } from "@/lib/db/client"
import { grantPackScans, grantScans } from "@/lib/scans/balance"
import { z } from "zod"

export async function grantAdminScansAction(input: unknown) {
  const session = await requireAdmin()
  const data = scanGrantSchema.parse(input)

  if (data.packId) {
    await grantPackScans({
      packId: data.packId,
      userId: data.userId,
      grantedById: session.user.id,
      metadata: data.reason ? { reason: data.reason } : undefined,
    })
  } else {
    if (data.tier) {
      await prisma.user.update({
        where: { id: data.userId },
        data: { scanTier: data.tier },
      })
    }

    await grantScans({
      userId: data.userId,
      amount: data.amount,
      reason: "admin_grant",
      tier: data.tier,
      grantedById: session.user.id,
      replaceBalance: Boolean(data.tier),
      metadata: data.reason ? { reason: data.reason } : undefined,
    })
  }

  revalidatePath("/admin")
  revalidatePath("/admin/tokens")
  revalidatePath("/admin/scans")
}

/** @deprecated Use grantAdminScansAction */
export async function grantAdminTokensAction(input: unknown) {
  return grantAdminScansAction(input)
}

export async function setUserRoleAction(userId: string, role: AppRole) {
  await requireAdmin()
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("Invalid role")
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  })

  revalidatePath("/admin/users")
}

const scanTierSchema = z.enum(SCAN_TIERS)

export async function setUserScanTierAction(userId: string, tier: ScanTier) {
  await requireAdmin()
  scanTierSchema.parse(tier)

  await prisma.user.update({
    where: { id: userId },
    data: { scanTier: tier },
  })

  revalidatePath("/admin/users")
}
