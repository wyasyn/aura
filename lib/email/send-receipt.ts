import { Resend } from "resend"

import { generateReceiptPdf } from "@/lib/billing/generate-receipt-pdf"
import { BILLING_HREF } from "@/lib/billing/constants"
import {
  buildReceiptEmailHtml,
  buildReceiptEmailText,
  receiptEmailSubject,
  type ReceiptEmailData,
} from "@/lib/email/receipt-template"
import { SCAN_TIER_LABELS } from "@/lib/models/types"
import { prisma } from "@/lib/db/client"
import { siteUrl } from "@/lib/site"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const from =
  process.env.EMAIL_FROM ?? "Aurora Organics <onboarding@resend.dev>"

/**
 * Emails the PDF receipt for a succeeded payment. Never throws: a delivery
 * failure must not roll back a payment the user already made, so problems are
 * logged and reported through the return value instead.
 */
export async function sendReceiptEmail(
  paymentId: string,
  userId: string,
): Promise<boolean> {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId, status: "succeeded" },
      include: {
        pack: { select: { label: true } },
        user: { select: { name: true, email: true } },
      },
    })

    if (!payment) {
      return false
    }

    const receipt = await generateReceiptPdf(paymentId, userId)
    if (!receipt) {
      return false
    }

    // Prefer the billing email the user entered at checkout over the login one.
    const snapshot = payment.billingSnapshot as {
      email?: unknown
      fullName?: unknown
    } | null
    const to =
      typeof snapshot?.email === "string" ? snapshot.email : payment.user.email
    const customerName =
      typeof snapshot?.fullName === "string"
        ? snapshot.fullName
        : payment.user.name

    const data: ReceiptEmailData = {
      customerName,
      receiptNumber: payment.receiptNumber,
      packLabel: payment.pack?.label ?? `${payment.scanCount} scans`,
      scanCount: payment.scanCount,
      tierLabel: SCAN_TIER_LABELS[payment.tier],
      amountCents: payment.amountCents,
      currency: payment.currency,
      paidAt: (payment.paidAt ?? payment.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      billingHref: `${siteUrl}${BILLING_HREF}`,
    }

    if (!resend) {
      console.info(
        `[dev] Receipt ${payment.receiptNumber} for ${to} (${receipt.buffer.length} bytes, not sent)`,
      )
      return false
    }

    const { error } = await resend.emails.send({
      from,
      to,
      subject: receiptEmailSubject(data),
      text: buildReceiptEmailText(data),
      html: buildReceiptEmailHtml(data),
      attachments: [
        {
          filename: `aura-receipt-${payment.receiptNumber}.pdf`,
          content: receipt.buffer.toString("base64"),
        },
      ],
    })

    if (error) {
      console.error("[email] Failed to send receipt", {
        paymentId,
        error,
      })
      return false
    }

    return true
  } catch (err) {
    console.error("[email] Receipt send threw", { paymentId, err })
    return false
  }
}
