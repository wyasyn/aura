import { NextResponse } from "next/server"

import { buildClinicScanCsv } from "@/lib/clinics/analytics"
import { resolveClinicSession } from "@/lib/clinics/membership"

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

  const csv = await buildClinicScanCsv(result.session.scope)
  const filename = `${result.session.tenant.subdomain}-scans.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
