import { NextResponse } from "next/server"

import { authorizeCronRequest } from "@/lib/cron/authorize"
import { prisma } from "@/lib/db/client"
import { syncProductCatalog } from "@/lib/products/ingest/sync-catalog"

export async function GET(request: Request) {
  const authorized = authorizeCronRequest(request)
  if (!authorized.ok) return authorized.response

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "BOOTSTRAP_ADMIN_EMAIL is not configured" },
      { status: 500 },
    )
  }

  const admin = await prisma.user.findUnique({ where: { email } })
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Bootstrap admin user not found" },
      { status: 500 },
    )
  }

  const result = await syncProductCatalog(admin.id)
  return NextResponse.json({ ok: true, ...result })
}
