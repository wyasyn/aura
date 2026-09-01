/**
 * Single source of truth for the app's own origin (scheme + host[:port], no
 * path, no trailing slash), and for which origins this deployment will trust.
 *
 * One deployment answers on several hosts at once — a production alias, a
 * git-branch alias, a per-deployment preview alias, a clinic subdomain, a
 * verified custom domain — but only one value can be pinned in an environment
 * variable. Everything that needs "our own origin" resolves it through here.
 *
 * ## Why the trust list is explicit
 *
 * On Vercel, VERCEL_URL and its siblings are injected by the platform and
 * cannot be set by a request, so matching a request's Host against them proved
 * the deployment actually owned that host. Self-hosted there is no equivalent:
 * behind an ALB or App Runner the Host header is whatever the client sent, and
 * X-Forwarded-Host is only as trustworthy as the proxy in front of it.
 *
 * So the argument is rebuilt rather than ported. A request-derived origin is
 * trusted only when it appears in a set assembled from configuration — never
 * because the request asserted it. With nothing configured the set still
 * contains getSiteUrl(), so an unrecognised Host is refused rather than
 * trusted; failing closed is the correct default for an auth origin check.
 */

function toOrigin(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    try {
      url = new URL(`https://${trimmed}`)
    } catch {
      return null
    }
  }

  if (url.hostname !== "localhost") {
    url.protocol = "https:"
  }

  return url.origin
}

type SiteUrlOptions = {
  /**
   * Prefer the stable production alias over this specific deployment's own
   * unique URL. Needed for links generated outside a request — clinic invite
   * emails — which must still resolve after the preview deployment that sent
   * them is torn down.
   *
   * Only affects the Vercel step of the precedence below. BETTER_AUTH_URL and
   * APP_URL are already stable, so when either is set this changes nothing.
   */
  preferStableAlias?: boolean
}

/**
 * The canonical origin for this deployment.
 *
 * Precedence:
 *   1. BETTER_AUTH_URL  — explicit, wins everywhere
 *   2. APP_URL          — the canonical origin when self-hosted
 *   3. Vercel's own alias, when running on Vercel
 *   4. localhost
 *
 * APP_URL sits above the Vercel values so a self-hosted deployment never has to
 * unset anything, and below BETTER_AUTH_URL so the existing pin still wins.
 * Nothing sets APP_URL on Vercel, so this ordering leaves that deployment
 * behaving exactly as before.
 */
export function getSiteUrl(options: SiteUrlOptions = {}): string {
  const vercelHost = options.preferStableAlias
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
    : process.env.NEXT_PUBLIC_VERCEL_URL

  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.APP_URL,
    vercelHost ? `https://${vercelHost}` : undefined,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const normalized = toOrigin(candidate)
    if (normalized) return normalized
  }

  return `http://localhost:${process.env.PORT ?? 3000}`
}

/**
 * Additional origins this deployment answers on, from TRUSTED_ORIGINS.
 *
 * Comma-separated, exact hosts only. There is no wildcard syntax and none is
 * planned: a wildcard in an auth origin allowlist is how one mistake becomes
 * every subdomain an attacker can register. Clinic subdomains and verified
 * custom domains are covered by their own mechanisms, which check the database
 * rather than a pattern.
 */
export function getConfiguredTrustedOrigins(): string[] {
  const raw = process.env.TRUSTED_ORIGINS
  if (!raw?.trim()) return []

  return raw
    .split(",")
    .map((entry) => toOrigin(entry))
    .filter((value): value is string => value !== null)
}

/**
 * Every origin a request may be trusted for on the strength of configuration
 * alone.
 *
 * Assembled from: the canonical origin, TRUSTED_ORIGINS, and — only when
 * actually running on Vercel — the three platform-injected aliases. Verified
 * custom domains are deliberately not here; they are resolved per request
 * against the database in lib/auth/server.ts, which is a stronger check than
 * this list can express.
 *
 * Never contains anything derived from the request being checked. That is the
 * whole point: this is the set a candidate is compared against, so a value that
 * came from the request would make the comparison meaningless.
 */
export function getConfiguredOrigins(): string[] {
  const origins = new Set<string>()

  origins.add(getSiteUrl())

  for (const origin of getConfiguredTrustedOrigins()) {
    origins.add(origin)
  }

  // Present only on Vercel. Injected by the platform, so a Host matching one of
  // these is an origin the deployment genuinely owns.
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter((value): value is string => Boolean(value))

  for (const host of vercelHosts) {
    const origin = toOrigin(`https://${host}`)
    if (origin) origins.add(origin)
  }

  return Array.from(origins)
}

/**
 * The trustable form of a request-derived origin, or null if it is not one.
 *
 * Returns the *normalised* origin rather than what the caller passed in, and
 * callers must trust that value rather than their own. Normalising forces https
 * for anything that is not localhost, so a request arriving with a downgraded
 * scheme — `X-Forwarded-Proto: http` on a real host — matches the allowlist but
 * contributes `https://host` to the trusted set, never `http://host`. Handing
 * back the raw candidate would quietly widen trust to a plaintext origin.
 *
 * Exact whole-origin match otherwise. No prefix, no suffix, no wildcards:
 * `https://evil-aurora.app`, `https://aurora.app.evil.com` and
 * `https://sub.aurora.app` must all fail a check intended for
 * `https://aurora.app`, and comparing whole origins is the only way to be sure.
 * Port is part of the origin, so `https://aurora.app:8443` is a different one.
 */
export function configuredOrigin(candidate: string): string | null {
  const normalized = toOrigin(candidate)
  if (!normalized) return null
  return getConfiguredOrigins().includes(normalized) ? normalized : null
}

/** Convenience predicate over {@link configuredOrigin}. */
export function isConfiguredOrigin(candidate: string): boolean {
  return configuredOrigin(candidate) !== null
}
