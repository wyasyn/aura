const MAX_SCAN_IMAGE_BYTES = 2 * 1024 * 1024

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function parseScanImageBase64(
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
): { buffer: Buffer; mimeType: string } | null {
  if (!imageBase64?.trim()) {
    return null
  }

  const mimeType = imageMimeType?.trim() || "image/jpeg"
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return null
  }

  const buffer = Buffer.from(imageBase64, "base64")
  if (buffer.length === 0 || buffer.length > MAX_SCAN_IMAGE_BYTES) {
    return null
  }

  return { buffer, mimeType }
}

export function scanImageToDataUri(
  imageData: Buffer | Uint8Array | null | undefined,
  imageMimeType: string | null | undefined,
): string | null {
  if (!imageData || imageData.length === 0) {
    return null
  }

  const mimeType = imageMimeType?.trim() || "image/jpeg"
  const base64 = Buffer.from(imageData).toString("base64")
  return `data:${mimeType};base64,${base64}`
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0)
  }
  return btoa(binary)
}
