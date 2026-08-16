import { NextResponse } from "next/server"

import { transcribeSpeech } from "@/lib/ai/adapter"
import { recordAiUsage } from "@/lib/ai/usage/record-usage"
import { requireApiSession } from "@/lib/auth/api-session"
import { toUserFacingChatError } from "@/lib/chat/errors"

const MAX_AUDIO_BYTES = 5 * 1024 * 1024

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
])

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? ""
}

export async function POST(request: Request) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid voice upload." },
      { status: 400 },
    )
  }

  const audioField = formData.get("audio")
  if (!(audioField instanceof File) || audioField.size === 0) {
    return NextResponse.json(
      { ok: false, error: "No voice recording was provided." },
      { status: 400 },
    )
  }

  if (audioField.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: "Recording is too long. Try a shorter message.",
      },
      { status: 413 },
    )
  }

  const mimeType = audioField.type || "audio/webm"
  const normalizedMimeType = normalizeMimeType(mimeType)
  if (
    !ALLOWED_AUDIO_TYPES.has(mimeType) &&
    !ALLOWED_AUDIO_TYPES.has(normalizedMimeType)
  ) {
    return NextResponse.json(
      { ok: false, error: "Unsupported audio format." },
      { status: 400 },
    )
  }

  const langField = formData.get("lang")
  const lang = typeof langField === "string" ? langField.trim() : undefined

  try {
    const audio = Buffer.from(await audioField.arrayBuffer())
    const result = await transcribeSpeech({
      audio,
      mimeType: normalizedMimeType || mimeType,
      lang,
    })

    await recordAiUsage({
      feature: "transcribe",
      usage: result.usage,
      userId: authResult.session.user.id,
      latencyMs: result.latencyMs,
    })

    return NextResponse.json({
      ok: true,
      text: result.text,
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: toUserFacingChatError(err, 500),
      },
      { status: 500 },
    )
  }
}
