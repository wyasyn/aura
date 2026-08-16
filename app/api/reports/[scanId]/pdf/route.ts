import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { generateSkinReportPdf } from "@/lib/pdf/generate-skin-report"

type RouteContext = {
  params: Promise<{ scanId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const { scanId } = await context.params

  try {
    const pdf = await generateSkinReportPdf(scanId, session.user.id)

    if (!pdf) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aura-skin-report-${scanId}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (err) {
    console.error("[pdf] Failed to generate skin report:", err)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    )
  }
}
