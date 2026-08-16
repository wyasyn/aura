import { headers } from "next/headers"

const DEFAULT_RETURN_HREF = "/dashboard"

/** Paths a cancelled gate must never bounce back to, gate loops included. */
const BLOCKED_PREFIXES = ["/scan", "/login", "/signup", "/onboarding"]

/**
 * Where to send a user who declines a paywall gate: the page they arrived
 * from, when that is a same-origin page worth returning to. Falls back to the
 * dashboard for direct hits, external referrers, and installed PWA launches,
 * which have no usable history entry.
 */
export async function getReturnHref(
  fallback = DEFAULT_RETURN_HREF,
): Promise<string> {
  const headerList = await headers()
  const referer = headerList.get("referer")
  if (!referer) {
    return fallback
  }

  let url: URL
  try {
    url = new URL(referer)
  } catch {
    return fallback
  }

  const host = headerList.get("host")
  if (!host || url.host !== host) {
    return fallback
  }

  const path = `${url.pathname}${url.search}`
  if (BLOCKED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return fallback
  }

  return path
}
