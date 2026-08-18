"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

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

  await prisma.$transaction([
    prisma.affiliateProfile.update({
      where: { id: affiliateProfileId },
      data: {
        status: "approved",
        rejectionReason: null,
        couponCode: coupon.code,
        wooCommerceCouponId: coupon.id,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    }),
    prisma.user.update({
      where: { id: profile.userId },
      data: { role: "affiliate" },
    }),
  ])

  revalidateAffiliates()
}

const rejectSchema = z.object({
  affiliateProfileId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
})

export async function rejectAffiliateApplicationAction(input: unknown) {
  const session = await requireAdmin()
  const { affiliateProfileId, reason } = rejectSchema.parse(input)

  await prisma.affiliateProfile.update({
    where: { id: affiliateProfileId },
    data: {
      status: "rejected",
      rejectionReason: reason || null,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  })

  revalidateAffiliates()
}
