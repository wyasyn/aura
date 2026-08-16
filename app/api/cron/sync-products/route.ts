import { NextResponse } from "next/server"

import { prisma } from "@/lib/db/client"
import { syncProductCatalog } from "@/lib/products/ingest/sync-catalog"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

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
