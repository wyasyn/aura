import { NextResponse } from "next/server"

import { parseLimit, withPartnerApi } from "@/lib/api-keys/handler"
import { prisma } from "@/lib/db/client"

/**
 * GET /api/v1/scans — scans taken through the calling clinic.
 *
 * Filtered by the organization the API key belongs to, so a key can only ever
 * read its own tenant's records. Cursor paginated on id, which is stable under
 * inserts in a way that offset pagination is not.
 */
export const GET = withPartnerApi(async (caller, request) => {
  const url = new URL(request.url)
  const limit = parseLimit(request)
  const cursor = url.searchParams.get("cursor")

  const scans = await prisma.scan.findMany({
    where: { organizationId: caller.organizationId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      status: true,
      captureMode: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      result: { select: { overallBand: true } },
    },
  })

  const hasMore = scans.length > limit
  const page = hasMore ? scans.slice(0, limit) : scans

  return NextResponse.json({
    data: page.map((scan) => ({
      id: scan.id,
      status: scan.status,
      captureMode: scan.captureMode,
      createdAt: scan.createdAt.toISOString(),
      overallBand: scan.result?.overallBand ?? null,
      patient: { name: scan.user.name, email: scan.user.email },
    })),
    pagination: {
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      limit,
    },
  })
})
