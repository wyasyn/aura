"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAuditIn } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
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

  // Money leaving the platform on one administrator's say-so. The payout row
  // records that it happened; the audit entry records who decided it, which is
  // a different question and the one a dispute actually turns on.
  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    const payout = await tx.affiliatePayout.create({
      data: {
        affiliateId: data.affiliateId,
        amountCents: data.amountCents,
        note: data.note || null,
        createdById: session.user.id,
      },
      select: { id: true },
    })

    await recordAuditIn(tx, {
      action: "affiliate.payout_recorded",
      subjectType: "affiliate",
      subjectId: data.affiliateId,
      actorId: session.user.id,
      actorRole: "admin",
      requestId,
      metadata: { payoutId: payout.id, amountCents: data.amountCents },
    })
  })

  revalidatePath("/admin/affiliates")
  revalidatePath("/affiliate")
}
