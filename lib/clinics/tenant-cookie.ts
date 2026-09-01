/**
 * Fallback tenant selection for hosts that cannot do wildcard subdomains.
 *
 * Vercel does not issue wildcard subdomains on *.vercel.app, so
 * clinic1.my-project.vercel.app will never resolve. Without a domain of your
 * own there is nothing in the Host header to identify a tenant by.
 *
 * Visiting /c/<subdomain> pins the browser to that clinic with a cookie, and
 * tenant resolution falls back to it only when the host says nothing. Once a
 * wildcard domain is configured the Host header wins and this is never
 * consulted, so it cannot override or spoof real subdomain routing.
 *
 * The trade-off is one clinic at a time per browser, which is why this is a
 * fallback for previews and domainless deployments rather than the mechanism
 * a production tenant should rely on.
 */

import { getSiteUrl } from "@/lib/site-url"

export const TENANT_COOKIE = "aurora-tenant"

/** Session-length: pinning should not outlive the browser session silently. */
export const TENANT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const

/**
 * Whether host-based tenancy is available. When a wildcard root domain is
 * configured, subdomains work properly and the cookie fallback is disabled.
 */
export function hostBasedTenancyConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN?.trim())
}

/**
 * The origin the app is actually served from, used to build clinic links when
 * there is no tenant root domain to hang a subdomain off.
 *
 * Prefers the stable production alias over this deployment's own unique URL
 * (see getSiteUrl's preferStableAlias) — these links go out in invite emails
 * and must still resolve once the preview deployment that sent them is gone.
 */
export function appOrigin(): string {
  return getSiteUrl({ preferStableAlias: true })
}
