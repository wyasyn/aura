import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit/log"
import { requireApiSession } from "@/lib/auth/api-session"
import { normalizeRole } from "@/lib/auth/role"
import { buildTrainingExport, describeExportFailure } from "@/lib/training/export"

/**
 * Downloads the validated, de-identified dataset as JSON.
 *
 * Platform admins only, and every download is audited: an export is the moment
 * health-derived data leaves the system, so who took it and how much needs to
 * be answerable later.
 */
export async function GET() {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }

  const { session } = authResult
  if (normalizeRole(session.user.role) !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const result = await buildTrainingExport()

  if (!result.ok) {
    // Recorded too: a blocked export is exactly the event worth reviewing.
    await recordAudit({
      action: "training.dataset.exported",
      subjectType: "dataset",
      actorId: session.user.id,
      actorRole: "admin",
      metadata: { blocked: true, reason: result.reason },
    })

    return NextResponse.json(
      { error: result.reason, message: describeExportFailure(result) },
      { status: 409 },
    )
  }

  await recordAudit({
    action: "training.dataset.exported",
    subjectType: "dataset",
    actorId: session.user.id,
    actorRole: "admin",
    metadata: { recordCount: result.count },
  })

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      recordCount: result.count,
      notice:
        "De-identified, expert-validated examples. Contains no patient identifiers.",
      rows: result.rows,
    },
    null,
    2,
  )

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="aurora-training-dataset-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  })
}
