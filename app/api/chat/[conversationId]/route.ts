import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { loadChatConversation } from "@/lib/chat/send-message"
import { toUserFacingChatError } from "@/lib/chat/errors"

type RouteContext = {
  params: Promise<{ conversationId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const { conversationId } = await context.params

  try {
    const conversation = await loadChatConversation(
      conversationId,
      session.user.id,
    )

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found." },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, conversation })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: toUserFacingChatError(err, 500) },
      { status: 500 },
    )
  }
}
