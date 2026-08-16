import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { loadFollowUpConversation, sendChatMessage } from "@/lib/chat/send-message"
import { toUserFacingChatError } from "@/lib/chat/errors"
import { parseChatRequest } from "@/lib/chat/parse-request"

type RouteContext = {
  params: Promise<{ scanId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const { scanId } = await context.params

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
      kind: "follow_up",
      scanId,
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
    return NextResponse.json(
      { ok: false, error: toUserFacingChatError(err, 500) },
      { status: 500 },
    )
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  const { scanId } = await context.params

  try {
    const conversation = await loadFollowUpConversation(
      scanId,
      session.user.id,
    )

    return NextResponse.json({ ok: true, conversation })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: toUserFacingChatError(err, 500) },
      { status: 500 },
    )
  }
}
