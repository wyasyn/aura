import { NextResponse } from "next/server"

import { buildClinicScanCsv } from "@/lib/clinics/analytics"
import { resolveClinicSession } from "@/lib/clinics/membership"
import { can } from "@/lib/clinics/permissions"
import { recordAudit, recordDenied } from "@/lib/audit/log"

/**
 * CSV export of the calling clinic's scans.
 *
 * Uses the same membership resolution as the dashboard, so the export can only
 * ever contain the tenant the caller actually belongs to.
 */
export async function GET() {
  const result = await resolveClinicSession()

  if (result.kind !== "ok") {
    // Same 404 for a non-member as for a host with no clinic, so the response
    // does not reveal whether a subdomain belongs to a real tenant.
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { session } = result

  // Membership alone is not authorization: a member without SCAN_VIEW may
  // not lift the whole patient list out as a file.
  if (!can(session, "SCAN_VIEW")) {
    await recordDenied({
      action: "patient.exported",
      subjectType: "clinic",
      subjectId: session.tenant.organizationId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      metadata: { permission: "SCAN_VIEW", format: "csv" },
    })
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const csv = await buildClinicScanCsv(session.scope)

  // Bulk extraction of patient records is exactly what an audit is for.
  await recordAudit({
    action: "patient.exported",
    subjectType: "clinic",
    subjectId: session.tenant.organizationId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { format: "csv" },
  })
  const filename = `${session.tenant.subdomain}-scans.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
