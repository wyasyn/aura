/**
 * Profile picture rules, kept pure so they can be tested without a request.
 *
 * The declared Content-Type is not trusted. A browser will happily label
 * anything, so the format is decided by the file's own leading bytes and the
 * declared type is only accepted when the two agree — that is what stops a
 * renamed script or an SVG (which can carry script) being stored and later
 * served back with an image content type.
 */

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

/** Formats a browser will render inline and that carry no active content. */
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number]

export type AvatarCheck =
  | { ok: true; mimeType: AvatarMimeType }
  | { ok: false; error: string }

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/** The format the bytes actually are, regardless of what they were called. */
export function sniffImageType(bytes: Uint8Array): AvatarMimeType | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp"
  }

  return null
}

export function checkAvatar(input: {
  bytes: Uint8Array
  declaredType: string | null | undefined
}): AvatarCheck {
  if (input.bytes.byteLength === 0) {
    return { ok: false, error: "That file is empty." }
  }
  if (input.bytes.byteLength > AVATAR_MAX_BYTES) {
    return {
      ok: false,
      error: `Pictures must be 2 MB or smaller. Yours is ${(input.bytes.byteLength / 1024 / 1024).toFixed(1)} MB.`,
    }
  }

  const sniffed = sniffImageType(input.bytes)
  if (!sniffed) {
    return { ok: false, error: "Use a JPEG, PNG or WebP image." }
  }

  // Both must agree. A mismatch means the file is not what it claims, which is
  // worth refusing outright rather than quietly trusting the bytes.
  const declared = input.declaredType?.trim().toLowerCase()
  if (declared && declared !== sniffed) {
    return { ok: false, error: "That file does not match its format." }
  }

  return { ok: true, mimeType: sniffed }
}

/**
 * The URL stored in User.image after an upload.
 *
 * Carries the update time so a new picture is fetched immediately rather than
 * showing the previous one from cache until the browser decides otherwise.
 */
export function avatarUrl(userId: string, updatedAt: Date): string {
  return `/api/avatar/${userId}?v=${updatedAt.getTime()}`
}

/** Whether a stored image value is one of ours rather than a federated URL. */
export function isUploadedAvatar(image: string | null | undefined): boolean {
  return Boolean(image?.startsWith("/api/avatar/"))
}
