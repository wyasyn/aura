import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { loadEmptyAdviceSession } from "@/lib/chat/send-message"

export async function POST() {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const conversation = await loadEmptyAdviceSession(session.user.id)
  return NextResponse.json({ ok: true, conversation })
}
