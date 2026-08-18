"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

const payoutSchema = z.object({
  affiliateId: z.string().trim().min(1),
  amountCents: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
})

export async function recordAffiliatePayoutAction(input: unknown) {
  const session = await requireAdmin()
  const data = payoutSchema.parse(input)

  await prisma.affiliatePayout.create({
    data: {
      affiliateId: data.affiliateId,
      amountCents: data.amountCents,
      note: data.note || null,
      createdById: session.user.id,
    },
  })

  revalidatePath("/admin/affiliates")
  revalidatePath("/affiliate")
}
