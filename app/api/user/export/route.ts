import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { buildUserDataExport, exportFilename } from "@/lib/user/export-data"

/**
 * Portable copy of everything held about the signed-in account.
 *
 * Downloaded rather than emailed, so the data never leaves the authenticated
 * session. `no-store` keeps it out of any shared cache.
 */
export async function GET() {
  const result = await requireApiSession()
  if ("response" in result) {
    return result.response
  }

  const data = await buildUserDataExport(result.session.user.id)

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename()}"`,
      "Cache-Control": "no-store, private",
    },
  })
}
