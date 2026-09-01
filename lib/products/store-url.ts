import { AURORA_STORE_ORIGIN } from "@/lib/products/constants"

type ResolveStoreUrlInput = {
  storeUrl?: string | null
  slug: string
}

export function resolveStoreUrl({
  storeUrl,
  slug,
}: ResolveStoreUrlInput): string {
  const trimmed = storeUrl?.trim()
  if (trimmed) {
    return trimmed
  }

  return `${AURORA_STORE_ORIGIN}/product/${slug}/`
}
