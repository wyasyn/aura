/*
 * Aura service worker.
 *
 * Its first job is to exist: browsers only offer their own install affordance
 * for a site that registers a worker with a fetch handler. The app ships no
 * install button, so this is what makes it installable.
 *
 * Its second job is deliberately small. It caches immutable build assets and a
 * standalone offline page, and nothing else. HTML is never written to a cache:
 * a report, a dashboard or a chat cached here could be served to a signed-out
 * visitor or to the next person on a shared phone, which the privacy rules in
 * AGENTS.md do not allow.
 *
 * Bump VERSION when this file changes; the old caches are dropped on activate.
 */

const VERSION = "v1"
const STATIC_CACHE = `aura-static-${VERSION}`
const OFFLINE_CACHE = `aura-offline-${VERSION}`
const CURRENT_CACHES = [STATIC_CACHE, OFFLINE_CACHE]

/*
 * A self-contained page with no /_next/* references, so it cannot go stale
 * against a later deploy the way a precached Next.js route would.
 */
const OFFLINE_URL = "/offline.html"

/** Content-hashed or versionless-but-immutable. Safe to serve from cache. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/")
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("aura-") && !CURRENT_CACHES.includes(key)
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request

  if (request.method !== "GET") return
  // Range requests (video, PDF streaming) break when replayed from a cache.
  if (request.headers.has("range")) return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  if (url.origin !== self.location.origin) return
  // Auth, chat, scan and report traffic always goes to the network.
  if (url.pathname.startsWith("/api/")) return
  // React Server Component payloads: an HTML fallback here would corrupt the
  // router, so leave them entirely alone.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(networkWithOfflineFallback(request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request, { cacheName: STATIC_CACHE })
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function networkWithOfflineFallback(request) {
  try {
    return await fetch(request)
  } catch {
    const offline = await caches.match(OFFLINE_URL, {
      cacheName: OFFLINE_CACHE,
    })
    if (offline) return offline
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
