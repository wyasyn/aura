/**
 * Values the DNS instructions need to show a clinic.
 *
 * Kept apart from custom-domain.ts because that module imports node:dns for
 * verification. A client component importing these from there would drag a
 * Node built-in into the browser bundle and fail the build.
 */

/** Where the proof record lives, e.g. _aurora-verify.skin.clinic.com */
export const VERIFICATION_RECORD_PREFIX = "_aurora-verify"

/** What the domain's own record should point at. */
export const DOMAIN_TARGET = "cname.vercel-dns.com"
