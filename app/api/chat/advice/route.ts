import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { loadAdviceConversation, sendChatMessage } from "@/lib/chat/send-message"
import { toUserFacingChatError } from "@/lib/chat/errors"
import { parseChatRequest } from "@/lib/chat/parse-request"

export async function POST(request: Request) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const parsed = await parseChatRequest(request)
  if ("error" in parsed) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 },
    )
  }

  try {
    const result = await sendChatMessage({
      userId: session.user.id,
      message: parsed.message,
      kind: "advice",
      conversationId: parsed.conversationId,
      image: parsed.image,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: toUserFacingChatError(result.error, result.status),
        },
        { status: result.status },
      )
    }

    return NextResponse.json({
      ok: true,
      conversationId: result.conversationId,
      assistantMessage: result.assistantMessage,
      assistantMetadata: result.assistantMetadata,
      blocked: result.blocked,
      estimatedMessagesRemaining: result.estimatedMessagesRemaining,
    })
  } catch (err) {
    console.error("[chat/advice] POST failed:", err)
    return NextResponse.json(
      { ok: false, error: toUserFacingChatError(err, 500) },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const conversationId =
    new URL(request.url).searchParams.get("conversationId") ?? undefined

  try {
    const conversation = await loadAdviceConversation(
      session.user.id,
      conversationId,
    )
    return NextResponse.json({ ok: true, conversation })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: toUserFacingChatError(err, 500) },
      { status: 500 },
    )
  }
}
