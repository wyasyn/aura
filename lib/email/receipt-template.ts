import { formatMoneyCents } from "@/lib/payments/format"

const BRAND_NAME = "Aurora Organics"

export type ReceiptEmailData = {
  customerName: string
  receiptNumber: string
  packLabel: string
  scanCount: number
  tierLabel: string
  amountCents: number
  currency: string
  paidAt: string
  billingHref: string
}

export function receiptEmailSubject(data: ReceiptEmailData): string {
  return `Your ${BRAND_NAME} receipt ${data.receiptNumber}`
}

export function buildReceiptEmailText(data: ReceiptEmailData): string {
  const amount = formatMoneyCents(data.amountCents, data.currency)

  return [
    `Hi ${data.customerName},`,
    "",
    `Thanks for your purchase. Your ${data.scanCount} ${data.tierLabel} scans are ready to use.`,
    "",
    `Receipt: ${data.receiptNumber}`,
    `Item: ${data.packLabel}`,
    `Total paid: ${amount}`,
    `Date: ${data.paidAt}`,
    "",
    "The full receipt is attached as a PDF.",
    `Your billing history: ${data.billingHref}`,
    "",
    `${BRAND_NAME}`,
  ].join("\n")
}

export function buildReceiptEmailHtml(data: ReceiptEmailData): string {
  const amount = formatMoneyCents(data.amountCents, data.currency)

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#666666;font-size:14px;">${label}</td>
      <td style="padding:6px 0;text-align:right;font-size:14px;color:#1a1a1a;">${value}</td>
    </tr>`

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#1a1a1a;">Payment received</p>
          <p style="margin:0 0 24px;font-size:14px;color:#666666;">
            Hi ${data.customerName}, your ${data.scanCount} ${data.tierLabel} scans are ready to use.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e0db;border-bottom:1px solid #e5e0db;padding:8px 0;">
            ${row("Receipt", data.receiptNumber)}
            ${row("Item", data.packLabel)}
            ${row("Date", data.paidAt)}
            ${row("Total paid", `<strong>${amount}</strong>`)}
          </table>

          <p style="margin:24px 0 0;font-size:14px;color:#666666;">
            The full receipt is attached as a PDF. You can also find it any time in
            <a href="${data.billingHref}" style="color:#8b6914;">your billing history</a>.
          </p>

          <p style="margin:24px 0 0;font-size:12px;color:#888888;">${BRAND_NAME}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
