"use client"

import { useEffect } from "react"

/**
 * Registers public/sw.js. A registered worker with a fetch handler is what
 * makes browsers offer their own install affordance, so this is the whole of
 * the app's install story: there is no install button by design.
 *
 * Renders nothing and never throws: a failed registration must not take the
 * page down with it.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // A caching worker sits badly with dev HMR, and installability only
    // matters over HTTPS anyway.
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => {
        console.warn("Service worker registration failed", error)
      })
  }, [])

  return null
}
