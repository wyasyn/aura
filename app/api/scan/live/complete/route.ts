import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { toUserFacingScanError } from "@/lib/scan/errors"
import type { LiveSessionUsage } from "@/lib/scan/types"
import { runLiveAnalyzeScan } from "@/lib/scan/run-live-analyze"

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

/** Upper bound per token counter, since these totals come from the browser. */
const MAX_LIVE_TOKENS = 5_000_000

function clampTokenCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.min(Math.floor(value), MAX_LIVE_TOKENS)
}

/**
 * The Live session runs in the browser, so its token counts are client
 * reported. Treat them as advisory: parse defensively and clamp.
 */
function parseLiveSessionUsage(raw: string): LiveSessionUsage | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const usage: LiveSessionUsage = {
      promptTokenCount: clampTokenCount(parsed.promptTokenCount),
      responseTokenCount: clampTokenCount(parsed.responseTokenCount),
      totalTokenCount: clampTokenCount(parsed.totalTokenCount),
    }
    const hasTokens =
      usage.promptTokenCount > 0 ||
      usage.responseTokenCount > 0 ||
      usage.totalTokenCount > 0
    return hasTokens ? usage : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }
  const { session } = authResult

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid live scan upload." },
      { status: 400 },
    )
  }

  const image = formData.get("image")
  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json(
      { ok: false, error: toUserFacingScanError(new Error("Invalid scan image")) },
      { status: 400 },
    )
  }

  const transcriptField = formData.get("transcript")
  const transcript =
    typeof transcriptField === "string" ? transcriptField.trim() : ""

  const durationField = formData.get("sessionDurationMs")
  const sessionDurationMs =
    typeof durationField === "string"
      ? Number.parseInt(durationField, 10) || 0
      : 0

  const usageField = formData.get("sessionUsage")
  const sessionUsage =
    typeof usageField === "string" ? parseLiveSessionUsage(usageField) : null

  const mimeField = formData.get("mimeType")
  const mimeType =
    typeof mimeField === "string" && ALLOWED_MIME.has(mimeField)
      ? (mimeField as "image/jpeg" | "image/png" | "image/webp")
      : image.type && ALLOWED_MIME.has(image.type)
        ? (image.type as "image/jpeg" | "image/png" | "image/webp")
        : "image/jpeg"

  const buffer = Buffer.from(await image.arrayBuffer())
  const result = await runLiveAnalyzeScan({
    userId: session.user.id,
    image: buffer,
    mimeType,
    transcript,
    sessionDurationMs,
    sessionUsage,
  })

  const status = result.ok
    ? 200
    : !result.ok && result.error.toLowerCase().includes("pro")
      ? 403
      : 400
  return NextResponse.json(result, { status })
}
