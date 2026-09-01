/**
 * Subdomain <-> tenant mapping. Pure functions only: this module is imported
 * by proxy.ts, which runs on every request, so it must stay free of database
 * and Node-only dependencies.
 */
// Safe to import here: tenant-cookie reads environment variables only, with no
// database or Node built-in dependency of its own.
import { appOrigin } from "@/lib/clinics/tenant-cookie"

/**
 * Labels that can never belong to a clinic, because they either already serve
 * the platform itself or are conventionally reserved for infrastructure.
 * Checked before a subdomain is ever persisted.
 */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "auth",
  "login",
  "signup",
  "dashboard",
  "clinic",
  "clinics",
  "static",
  "assets",
  "cdn",
  "img",
  "images",
  "mail",
  "email",
  "smtp",
  "ftp",
  "ns",
  "blog",
  "docs",
  "help",
  "support",
  "status",
  "billing",
  "pay",
  "checkout",
  "staging",
  "preview",
  "dev",
  "test",
  "demo",
  "localhost",
])

/**
 * A single DNS label: 1-63 chars, lowercase alphanumeric plus internal
 * hyphens. Deliberately stricter than DNS allows so a subdomain is always
 * safe to interpolate into a hostname.
 */
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export type SubdomainValidation =
  | { ok: true; subdomain: string }
  | { ok: false; error: string }

/** Validates and normalizes a user-supplied subdomain. */
export function validateSubdomain(raw: string): SubdomainValidation {
  const subdomain = raw.trim().toLowerCase()

  if (!subdomain) {
    return { ok: false, error: "Subdomain is required." }
  }
  if (subdomain.length < 3) {
    return { ok: false, error: "Subdomain must be at least 3 characters." }
  }
  if (subdomain.length > 63) {
    return { ok: false, error: "Subdomain must be 63 characters or fewer." }
  }
  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    return {
      ok: false,
      error:
        "Use lowercase letters, numbers, and hyphens only, starting and ending with a letter or number.",
    }
  }
  // Would be ambiguous with Punycode-encoded internationalized domains.
  if (subdomain.startsWith("xn--")) {
    return { ok: false, error: "Subdomain cannot start with \"xn--\"." }
  }
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return { ok: false, error: `"${subdomain}" is reserved.` }
  }

  return { ok: true, subdomain }
}

/** Strips the port and normalizes case. */
function normalizeHost(host: string): string {
  return host.trim().toLowerCase().split(":")[0]
}

/**
 * The apex domain tenants hang off, e.g. "aurora.app". Unset in local dev,
 * where `*.localhost` is used instead.
 */
function rootDomain(): string | null {
  return process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN?.trim().toLowerCase() || null
}

/**
 * Exposed so custom-domain validation can refuse the platform's own hosts.
 * Read at call time, like rootDomain above, rather than captured at import —
 * a value frozen at module load is invisible to tests and to any environment
 * that populates configuration after the module graph is built.
 */
export function platformRootDomain(): string | null {
  return rootDomain()
}

/** Strips protocol, path and port from a Host header or pasted URL. */
export function normalizeHostname(host: string | null | undefined): string | null {
  if (!host) return null
  const normalized = normalizeHost(host)
  return normalized || null
}

/**
 * Extracts the clinic subdomain from a Host header, or null when the request
 * is for the platform itself.
 *
 * Returns null for anything that isn't unambiguously a tenant host — the bare
 * root domain, an IP address, and crucially any host that doesn't match the
 * configured root domain at all. That last case is what keeps Vercel preview
 * URLs (`aura-git-branch-xyz.vercel.app`) from being read as a tenant named
 * "aura-git-branch-xyz".
 */
export function extractSubdomain(host: string | null | undefined): string | null {
  if (!host) return null

  const normalized = normalizeHost(host)
  if (!normalized) return null

  // Local development: <subdomain>.localhost resolves to 127.0.0.1 in browsers
  // without any hosts-file entry, which is what makes tenants testable locally.
  if (normalized.endsWith(".localhost")) {
    return firstLabelIfSingle(normalized.slice(0, -".localhost".length))
  }

  const root = rootDomain()
  if (!root) return null
  if (normalized === root) return null
  if (!normalized.endsWith(`.${root}`)) return null

  return firstLabelIfSingle(normalized.slice(0, -`.${root}`.length))
}

/**
 * Accepts only a single label. A multi-label prefix ("a.b.root.com") is not a
 * tenant we issued, so it is rejected rather than guessed at.
 */
function firstLabelIfSingle(prefix: string): string | null {
  if (!prefix || prefix.includes(".")) return null
  if (RESERVED_SUBDOMAINS.has(prefix)) return null
  return SUBDOMAIN_PATTERN.test(prefix) ? prefix : null
}

/** Builds the public URL for a clinic, used in invites and admin links. */
/**
 * The public URL for a clinic.
 *
 * `origin` should be the origin the current request arrived on — see
 * lib/clinics/request-origin.ts. Passing it keeps generated links correct on
 * whatever host the app is actually served from, rather than baking in a
 * configured value that goes stale the moment the deployment moves.
 */
export function clinicUrl(
  subdomain: string,
  path = "/",
  origin?: string,
): string {
  const root = rootDomain()
  const suffix = path.startsWith("/") ? path : `/${path}`

  if (root) {
    return `https://${subdomain}.${root}${suffix}`
  }

  // Local development: *.localhost resolves to 127.0.0.1 in browsers with no
  // hosts-file entry, so real subdomains work here without any DNS.
  if (process.env.NODE_ENV !== "production" && !origin) {
    const port = process.env.PORT || "3000"
    return `http://${subdomain}.localhost:${port}${suffix}`
  }

  // Deployed with no wildcard domain — most often *.vercel.app, which cannot
  // host tenant subdomains at all. Link to the pinning route on this same
  // origin instead of a subdomain that will never resolve.
  const base = (origin ?? appOrigin()).replace(/\/$/, "")

  // Locally a real subdomain still works and is the better link, since it
  // exercises the same host-based routing production uses.
  if (base.includes("localhost") && process.env.NODE_ENV !== "production") {
    const port = process.env.PORT || "3000"
    return `http://${subdomain}.localhost:${port}${suffix}`
  }

  const target = suffix === "/" ? "" : `?next=${encodeURIComponent(suffix)}`
  return `${base}/c/${subdomain}${target}`
}
