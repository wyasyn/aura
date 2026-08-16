const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function toDataUri(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`
}

export async function fetchImageDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url?.trim()) return null

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!response.ok) return null

    const contentType = response.headers.get("content-type") ?? "image/jpeg"
    if (!contentType.startsWith("image/")) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return null
    }

    return toDataUri(buffer, contentType)
  } catch {
    return null
  }
}

export async function resolveProductImageDataUris(
  imageUrls: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const uniqueUrls = [
    ...new Set(imageUrls.filter((url): url is string => Boolean(url?.trim()))),
  ]

  const entries = await Promise.all(
    uniqueUrls.map(async (url) => {
      const dataUri = await fetchImageDataUri(url)
      return dataUri ? ([url, dataUri] as const) : null
    }),
  )

  return new Map(entries.filter((entry): entry is [string, string] => entry != null))
}
