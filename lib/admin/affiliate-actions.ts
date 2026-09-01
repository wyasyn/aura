"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAuditIn } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { generateCouponCode } from "@/lib/affiliates/coupon-code"
import { getAffiliateSettings } from "@/lib/affiliates/queries"
import { createAffiliateCoupon } from "@/lib/affiliates/woocommerce-coupons"

function revalidateAffiliates() {
  revalidatePath("/admin/affiliates")
}

export async function approveAffiliateApplicationAction(
  affiliateProfileId: string,
) {
  const session = await requireAdmin()

  const profile = await prisma.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    include: { user: { select: { name: true } } },
  })
  if (!profile) {
    throw new Error("Application not found")
  }

  const settings = await getAffiliateSettings()
  const code = generateCouponCode(profile.user.name)

  // Create the real WooCommerce coupon before touching our own DB — if the
  // store call fails, we don't want a "confirmed" affiliate with no working
  // code, since that's the entire attribution mechanism.
  const coupon = await createAffiliateCoupon({
    code,
    discountPercent: settings.customerDiscountBps / 100,
  })

  // Approval grants a platform role and issues a live discount code, so the
  // record joins the transaction that does both. The coupon code is recorded
  // deliberately: it is the attribution mechanism, not a secret, and tracing a
  // disputed commission later means knowing which code was issued to whom.
  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    await tx.affiliateProfile.update({
      where: { id: affiliateProfileId },
      data: {
        status: "approved",
        rejectionReason: null,
        couponCode: coupon.code,
        wooCommerceCouponId: coupon.id,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    })

    await tx.user.update({
      where: { id: profile.userId },
      data: { role: "affiliate" },
    })

    await recordAuditIn(tx, {
      action: "affiliate.approved",
      subjectType: "affiliate",
      subjectId: affiliateProfileId,
      actorId: session.user.id,
      actorRole: "admin",
      requestId,
      metadata: {
        targetUserId: profile.userId,
        grantedRole: "affiliate",
        couponCode: coupon.code,
      },
    })
  })

  revalidateAffiliates()
}

const rejectSchema = z.object({
  affiliateProfileId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
})

export async function rejectAffiliateApplicationAction(input: unknown) {
  const session = await requireAdmin()
  const { affiliateProfileId, reason } = rejectSchema.parse(input)

  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    const updated = await tx.affiliateProfile.update({
      where: { id: affiliateProfileId },
      data: {
        status: "rejected",
        rejectionReason: reason || null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
      select: { userId: true },
    })

    await recordAuditIn(tx, {
      action: "affiliate.rejected",
      subjectType: "affiliate",
      subjectId: affiliateProfileId,
      actorId: session.user.id,
      actorRole: "admin",
      requestId,
      metadata: { targetUserId: updated.userId, hasReason: Boolean(reason) },
    })
  })

  revalidateAffiliates()
}
