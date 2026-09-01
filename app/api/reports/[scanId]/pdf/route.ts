import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import { requireApiSession } from "@/lib/auth/api-session"
import { normalizeRole } from "@/lib/auth/role"
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
    const report = await generateSkinReportPdf(scanId, session.user.id)

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // A clinical report leaving as a file. Tier C: this is the patient reading
    // their own record — the scan is scoped to session.user.id, so there is no
    // cross-tenant reach to guard — and a log failure must not stand between
    // someone and their own results.
    //
    // The tenant is recorded when the scan was taken through a clinic, so the
    // clinic can answer who downloaded what without the entry ever carrying the
    // assessment itself.
    await recordAudit({
      action: "report.viewed",
      subjectType: "report",
      subjectId: scanId,
      actorId: session.user.id,
      actorRole: normalizeRole(session.user.role),
      organizationId: report.organizationId,
      requestId: await currentRequestId(),
      metadata: { format: "pdf" },
    })

    return new NextResponse(new Uint8Array(report.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aurora-skin-report-${scanId}.pdf"`,
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
