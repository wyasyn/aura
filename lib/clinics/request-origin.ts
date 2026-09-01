import { cache } from "react"
import { headers } from "next/headers"

import { appOrigin } from "@/lib/clinics/tenant-cookie"

/**
 * The origin this request actually arrived on.
 *
 * Preferred over any configured value because it is correct wherever the app
 * is served from — the production alias, a preview deployment, a custom
 * domain, or localhost — without anyone remembering to update an environment
 * variable. A stale BETTER_AUTH_URL or a deployment-specific VERCEL_URL would
 * otherwise put the wrong host into links that clinics receive.
 *
 * Falls back to the configured origin outside a request, e.g. in a script.
 */
export const requestOrigin = cache(async (): Promise<string> => {
  try {
    const headerList = await headers()
    const host = headerList.get("host")
    if (!host) return appOrigin()

    // Behind Vercel's proxy the connection to the app is plain HTTP, so the
    // forwarded header is the only honest source of the external scheme.
    const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim()
    const scheme =
      forwardedProto ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https")

    return `${scheme}://${host}`
  } catch {
    return appOrigin()
  }
})
