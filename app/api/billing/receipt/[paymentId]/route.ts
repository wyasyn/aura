import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { generateReceiptPdf } from "@/lib/billing/generate-receipt-pdf"

type RouteContext = {
  params: Promise<{ paymentId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const { paymentId } = await context.params

  try {
    const receipt = await generateReceiptPdf(paymentId, session.user.id)

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(receipt.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aura-receipt-${receipt.receiptNumber}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (err) {
    console.error("[pdf] Failed to generate receipt:", err)
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 },
    )
  }
}
