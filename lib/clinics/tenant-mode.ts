import { cookies, headers } from "next/headers"

import { extractSubdomain } from "@/lib/clinics/subdomain"
import { TENANT_COOKIE } from "@/lib/clinics/tenant-cookie"
import { selectedTenantSubdomain } from "@/lib/clinics/tenant-request"

/**
 * How the tenant for this request was selected.
 *
 *   host     — the Host header named it: a subdomain, or a verified custom
 *              domain resolved later by resolveTenant.
 *   pin      — the fallback cookie named it, on a deployment whose host cannot
 *              carry a tenant at all.
 *   platform — not a clinic request.
 *
 * Reported rather than decided here: the precedence lives in
 * lib/clinics/tenant-request.ts and this reads it, so a fourth expression of
 * "host first, then cookie" cannot drift from the other three.
 */
export type TenancyMode = "host" | "pin" | "platform"

export async function tenancyMode(): Promise<TenancyMode> {
  const headerList = await headers()
  const host = headerList.get("host")

  if (extractSubdomain(host)) return "host"

  const pinned = (await cookies()).get(TENANT_COOKIE)?.value ?? null
  if (selectedTenantSubdomain({ host, pinnedTenant: pinned })) return "pin"

  // A verified custom domain names a tenant without carrying a subdomain, so
  // this is still host-based; only resolveTenant can confirm which clinic.
  return "platform"
}

/**
 * Whether the tenant came from the pin cookie, which is the only tenant
 * selection a person can undo from inside the app. On a real subdomain you
 * leave a clinic by going to a different host.
 */
export async function isPinnedTenancy(): Promise<boolean> {
  return (await tenancyMode()) === "pin"
}
