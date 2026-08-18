"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

const settingsSchema = z.object({
  commissionRateBps: z.number().int().min(0).max(10000),
  customerDiscountBps: z.number().int().min(0).max(10000),
})

export async function updateAffiliateSettingsAction(input: unknown) {
  await requireAdmin()
  const data = settingsSchema.parse(input)

  await prisma.affiliateSettings.upsert({
    where: { id: "global" },
    create: { id: "global", ...data },
    update: data,
  })

  revalidatePath("/admin/affiliates")
}
