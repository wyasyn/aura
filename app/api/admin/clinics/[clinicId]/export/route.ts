import { NextResponse } from "next/server"

import { buildClinicExport } from "@/lib/admin/clinic-offboard"
import { prisma } from "@/lib/db/client"
import { recordAuditIn, recordDenied } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
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
  const { clinicId } = await context.params

  if (normalizeRole(authResult.session.user.role) !== "admin") {
    // Reaching for a whole tenant's data without being an administrator is
    // exactly the attempt an investigation would want to find.
    await recordDenied({
      action: "admin.data_exported",
      subjectType: "clinic",
      subjectId: clinicId,
      actorId: authResult.session.user.id,
      actorRole: normalizeRole(authResult.session.user.role),
      // Correlated like the successful path. A refused attempt is the entry an
      // investigation starts from, and it is worth being able to line up with
      // whatever else that request touched.
      requestId: await currentRequestId(),
      metadata: { reason: "not_admin" },
    })
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data = await buildClinicExport(clinicId)

  if (!data) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
  }

  // This export crosses the tenant boundary and carries patient records out of
  // the system as a file. Recorded with counts rather than content: the entry
  // must say how much left and whose it was, never reproduce any of it.
  //
  // Tier A, without a transaction to join — the thing being recorded is a file
  // leaving, not a row changing. The equivalent guarantee is ordering: the
  // record is written first and a failure to write it refuses the download.
  // Data that left with no evidence that it left is the outcome worth avoiding.
  try {
    await recordAuditIn(prisma, {
      action: "admin.data_exported",
      subjectType: "clinic",
      subjectId: data.organization.id,
      actorId: authResult.session.user.id,
      actorRole: "admin",
      organizationId: data.organization.id,
      requestId: await currentRequestId(),
      metadata: {
        subdomain: data.clinic.subdomain,
        members: data.members.length,
        scans: data.scans.length,
      },
    })
  } catch (error) {
    console.error("[admin] Refusing export: audit write failed", error)
    return NextResponse.json(
      {
        error: "audit_unavailable",
        message: "This export could not be recorded, so it was not produced.",
      },
      { status: 503 },
    )
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="clinic-${data.clinic.subdomain}-export.json"`,
      "Cache-Control": "private, no-store",
    },
  })
}
