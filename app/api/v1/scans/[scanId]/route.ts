import { NextResponse } from "next/server"

import { withPartnerApi } from "@/lib/api-keys/handler"
import { prisma } from "@/lib/db/client"

/**
 * GET /api/v1/scans/:scanId — one scan with its assessment.
 *
 * The organizationId filter is part of the lookup rather than a check after it,
 * so another tenant's scan id is indistinguishable from one that doesn't exist.
 */
export const GET = withPartnerApi(async (caller, request) => {
  const scanId = new URL(request.url).pathname.split("/").pop()
  if (!scanId) {
    return NextResponse.json(
      { error: "bad_request", message: "Missing scan id." },
      { status: 400 },
    )
  }

  const scan = await prisma.scan.findFirst({
    where: { id: scanId, organizationId: caller.organizationId },
    select: {
      id: true,
      status: true,
      captureMode: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      result: true,
    },
  })

  if (!scan) {
    return NextResponse.json(
      { error: "not_found", message: "Scan not found." },
      { status: 404 },
    )
  }

  return NextResponse.json({
    id: scan.id,
    status: scan.status,
    captureMode: scan.captureMode,
    createdAt: scan.createdAt.toISOString(),
    patient: { name: scan.user.name, email: scan.user.email },
    assessment: scan.result
      ? {
          overallBand: scan.result.overallBand,
          summary: scan.result.summary,
          // Per-dimension bands live in this JSON column rather than as
          // separate fields; passed through as stored.
          dimensions: scan.result.dimensions,
          doshaTyping: scan.result.doshaTyping,
          disclaimerVersion: scan.result.disclaimerVersion,
        }
      : null,
  })
})
