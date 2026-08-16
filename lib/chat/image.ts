const ALLOWED_CHAT_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])

export const MAX_CHAT_IMAGE_BYTES = 4 * 1024 * 1024

export type ChatImageInput = {
  buffer: Buffer
  mimeType: "image/jpeg" | "image/png" | "image/webp"
}

export function parseChatImage(
  file: Blob,
): ChatImageInput | { error: string } {
  if (file.size === 0) {
    return { error: "Invalid image upload." }
  }

  if (file.size > MAX_CHAT_IMAGE_BYTES) {
    return { error: "Image must be 4 MB or smaller." }
  }

  const mimeType =
    file.type && ALLOWED_CHAT_IMAGE_MIME.has(file.type)
      ? (file.type as ChatImageInput["mimeType"])
      : "image/jpeg"

  return { buffer: Buffer.from([]), mimeType }
}

export async function readChatImageFile(
  file: Blob,
): Promise<ChatImageInput | { error: string }> {
  const parsed = parseChatImage(file)
  if ("error" in parsed) {
    return parsed
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  return { buffer, mimeType: parsed.mimeType }
}

export function chatImageToDataUrl(
  mimeType: string,
  data: Buffer | Uint8Array | null,
): string | null {
  if (!data || data.byteLength === 0) {
    return null
  }
  const base64 = Buffer.from(data).toString("base64")
  return `data:${mimeType};base64,${base64}`
}
