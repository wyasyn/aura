import type { Metadata } from "next"

import { resolveTenant } from "@/lib/clinics/tenant"

/**
 * Tenant-aware page metadata.
 *
 * Returns an empty object on the platform host so the page keeps whatever the
 * root layout already defines. On a clinic subdomain it overrides the title and
 * social preview, which would otherwise read "Aurora Organics" on the clinic's
 * own domain — visible to patients in their browser tab, bookmarks, and any
 * link they share.
 *
 * `title.absolute` is required to escape the root layout's
 * "%s | Aurora Organics" template, which would otherwise re-append the
 * platform name to a clinic's title.
 */
export async function tenantMetadata(pageTitle: string): Promise<Metadata> {
  const result = await resolveTenant()
  if (result.kind !== "tenant") return {}

  const { displayName } = result.tenant.branding
  const title = `${pageTitle} | ${displayName}`

  return {
    title: { absolute: title },
    openGraph: { title, siteName: displayName },
    twitter: { title },
    appleWebApp: { title: displayName },
  }
}
