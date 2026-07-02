import { NextResponse } from "next/server"

import {
  GeminiAdapterError,
  analyzeSkinImage,
  buildFallbackSkinAnalysis,
} from "@/lib/ai/gemini-adapter"

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/jpg", ["jpg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
])

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const images = formData.getAll("image")

    if (images.length !== 1 || !(images[0] instanceof File)) {
      return jsonError("Upload exactly one image using the image field.", 400)
    }

    const image = images[0]
    const normalizedType = normalizeMimeType(image.type)

    if (!normalizedType || !hasAllowedExtension(image.name, normalizedType)) {
      return jsonError("Only jpg, jpeg, png, and webp images are supported.", 400)
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return jsonError("Image must be 8MB or smaller.", 400)
    }

    if (image.size === 0) {
      return jsonError("Image upload is empty.", 400)
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer())
    const analysis = await analyzeSkinImage({
      imageBuffer,
      mimeType: normalizedType,
    })

    return NextResponse.json({
      success: true,
      fallback: false,
      image: {
        fileName: image.name,
        mimeType: normalizedType,
        size: image.size,
        stored: false,
      },
      analysis,
    })
  } catch (error) {
    if (error instanceof GeminiAdapterError && error.code === "missing_api_key") {
      return jsonError("Gemini is not configured. Add GEMINI_API_KEY to .env.local.", 503)
    }

    const fallback = buildFallbackSkinAnalysis()

    return NextResponse.json(
      {
        success: false,
        fallback: true,
        error:
          error instanceof GeminiAdapterError
            ? "Gemini analysis failed, so a cosmetic fallback report was returned."
            : "Scan analysis failed, so a cosmetic fallback report was returned.",
        image: {
          stored: false,
        },
        analysis: fallback,
      },
      { status: 200 },
    )
  }
}

function normalizeMimeType(mimeType: string) {
  if (mimeType === "image/jpg") return "image/jpeg"
  return ALLOWED_IMAGE_TYPES.has(mimeType) ? mimeType : null
}

function hasAllowedExtension(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase()
  const allowedExtensions = ALLOWED_IMAGE_TYPES.get(mimeType)

  if (!extension || !allowedExtensions) return false
  return allowedExtensions.includes(extension)
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      fallback: false,
      error: message,
      analysis: null,
    },
    { status },
  )
}
