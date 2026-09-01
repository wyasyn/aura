import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { toUserFacingScanError } from "@/lib/scan/errors"
import { runAnalyzeScan } from "@/lib/scan/run-analyze"

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

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
      { ok: false, error: "Invalid scan upload." },
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

  const mimeField = formData.get("mimeType")
  const mimeType =
    typeof mimeField === "string" && ALLOWED_MIME.has(mimeField)
      ? (mimeField as "image/jpeg" | "image/png" | "image/webp")
      : image.type && ALLOWED_MIME.has(image.type)
        ? (image.type as "image/jpeg" | "image/png" | "image/webp")
        : "image/jpeg"

  const buffer = Buffer.from(await image.arrayBuffer())
  const result = await runAnalyzeScan({
    userId: session.user.id,
    image: buffer,
    mimeType,
  })

  const status = result.ok ? 200 : 400
  return NextResponse.json(result, { status })
}
