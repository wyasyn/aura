import { createHmac, timingSafeEqual } from "node:crypto"

import { prisma } from "@/lib/db/client"
import { getAffiliateSettings } from "@/lib/affiliates/queries"

type WooCommerceOrderPayload = {
  id: number
  status: string
  currency: string
  total: string
  billing?: { email?: string }
  coupon_lines?: { code?: string }[]
}

/**
 * WooCommerce signs the raw request body with the webhook's secret (set when
 * the webhook is created in the WordPress admin — not auto-generated, the
 * admin chooses it and it must match WOOCOMMERCE_WEBHOOK_SECRET here).
 */
export function verifyWooCommerceSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")

  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signatureHeader)
  if (expectedBuf.length !== actualBuf.length) return false

  return timingSafeEqual(expectedBuf, actualBuf)
}

// completed/processing: payment has cleared, credit the commission.
// cancelled/refunded/failed: void it. pending/on-hold/anything else: wait
// for the next status-change webhook.
function toAffiliateOrderStatus(
  wooStatus: string,
): "confirmed" | "cancelled" | "pending" {
  if (wooStatus === "completed" || wooStatus === "processing") return "confirmed"
  if (["cancelled", "refunded", "failed"].includes(wooStatus)) return "cancelled"
  return "pending"
}

export type ProcessOrderResult =
  | { handled: true; affiliateId: string; status: string }
  | { handled: false; reason: string }

/**
 * Idempotent: keyed on wooCommerceOrderId, so a retried or repeated webhook
 * delivery (WooCommerce resends on any non-2xx, and fires again on every
 * status change) never double-counts a commission. The commission amount is
 * only computed once, on first sight of the order — later deliveries only
 * update its status.
 */
export async function processWooCommerceOrder(
  payload: WooCommerceOrderPayload,
): Promise<ProcessOrderResult> {
  const couponCode = payload.coupon_lines?.find((line) => line.code)?.code
  if (!couponCode) {
    return { handled: false, reason: "no_coupon" }
  }

  const affiliate = await prisma.affiliateProfile.findUnique({
    where: { couponCode },
  })
  if (!affiliate || affiliate.status !== "approved") {
    return { handled: false, reason: "unknown_affiliate_coupon" }
  }

  const status = toAffiliateOrderStatus(payload.status)
  const orderTotalCents = Math.round(Number.parseFloat(payload.total) * 100)

  const existing = await prisma.affiliateOrder.findUnique({
    where: { wooCommerceOrderId: payload.id },
  })

  if (existing) {
    await prisma.affiliateOrder.update({
      where: { id: existing.id },
      data: { status, orderTotalCents, currency: payload.currency },
    })
    return { handled: true, affiliateId: affiliate.id, status }
  }

  const settings = await getAffiliateSettings()
  const commissionAmountCents = Math.round(
    (orderTotalCents * settings.commissionRateBps) / 10_000,
  )

  await prisma.affiliateOrder.create({
    data: {
      affiliateId: affiliate.id,
      wooCommerceOrderId: payload.id,
      status,
      couponCode,
      orderTotalCents,
      currency: payload.currency,
      commissionRateBpsSnapshot: settings.commissionRateBps,
      commissionAmountCents,
      customerEmail: payload.billing?.email ?? null,
      placedAt: new Date(),
    },
  })

  return { handled: true, affiliateId: affiliate.id, status }
}
