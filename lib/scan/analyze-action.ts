"use server"

import { z } from "zod"

import { requireSession } from "@/lib/auth/session"
import { toUserFacingScanError } from "@/lib/scan/errors"
import { parseScanImageBase64 } from "@/lib/scan/image-bytes"
import { runAnalyzeScan } from "@/lib/scan/run-analyze"
import type { AnalyzeScanResult } from "@/lib/scan/types"

const analyzeScanInputSchema = z.object({
  imageBase64: z.string().min(1),
  imageMimeType: z
    .enum(["image/jpeg", "image/png", "image/webp"])
    .default("image/jpeg"),
})

export type { AnalyzeScanResult } from "@/lib/scan/types"

/** Prefer POST /api/scan/analyze to avoid logging image payloads in dev. */
export async function analyzeScanAction(
  input: z.input<typeof analyzeScanInputSchema>,
): Promise<AnalyzeScanResult> {
  const session = await requireSession()
  const parsed = analyzeScanInputSchema.parse(input)
  const image = parseScanImageBase64(parsed.imageBase64, parsed.imageMimeType)

  if (!image) {
    return { ok: false, error: toUserFacingScanError(new Error("Invalid scan image")) }
  }

  return runAnalyzeScan({
    userId: session.user.id,
    image: image.buffer,
    mimeType: image.mimeType as "image/jpeg" | "image/png" | "image/webp",
  })
}
