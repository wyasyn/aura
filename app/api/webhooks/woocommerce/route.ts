import { NextResponse } from "next/server"

import {
  processWooCommerceOrder,
  verifyWooCommerceSignature,
} from "@/lib/affiliates/webhook"

/**
 * Registered in WooCommerce as an "Order updated" webhook (WooCommerce →
 * Settings → Advanced → Webhooks). Fires on every order status change, which
 * is exactly what commission attribution needs — a single delivery on
 * checkout wouldn't tell us if the payment later failed or was refunded.
 */
export async function POST(request: Request) {
  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET
  if (!secret) {
    console.error("WooCommerce webhook received but WOOCOMMERCE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-wc-webhook-signature")

  if (!verifyWooCommerceSignature(rawBody, signature, secret)) {
    console.error("WooCommerce webhook signature verification failed")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // WooCommerce sends a harmless ping with no order body when a webhook is
  // first created/enabled — nothing to process, just acknowledge it.
  if (!rawBody.trim()) {
    return NextResponse.json({ ok: true, skipped: "empty_ping" })
  }

  let payload: Parameters<typeof processWooCommerceOrder>[0]
  try {
    payload = JSON.parse(rawBody)
  } catch (error) {
    console.error("WooCommerce webhook: invalid JSON payload", error)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  if (typeof payload.id !== "number") {
    return NextResponse.json({ ok: true, skipped: "not_an_order" })
  }

  const result = await processWooCommerceOrder(payload)
  return NextResponse.json({ ok: true, result })
}
