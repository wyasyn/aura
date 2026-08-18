import { NextResponse } from "next/server"

import { buildClinicExport } from "@/lib/admin/clinic-offboard"
import { requireApiSession } from "@/lib/auth/api-session"
import { normalizeRole } from "@/lib/auth/role"

type RouteContext = {
  params: Promise<{ clinicId: string }>
}

/**
 * Downloads a clinic's data as JSON, for handover or a data request before the
 * tenant is offboarded. A route handler rather than a server action so it
 * streams as a real file download.
 */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }

  // Platform-admin only: this crosses the tenant boundary by design, so it is
  // gated here rather than by clinic membership.
  if (normalizeRole(authResult.session.user.role) !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { clinicId } = await context.params
  const data = await buildClinicExport(clinicId)

  if (!data) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="clinic-${data.clinic.subdomain}-export.json"`,
      "Cache-Control": "private, no-store",
    },
  })
}
