import { Suspense } from "react"
import type { Metadata } from "next"

import { ClinicHomeContent } from "@/components/clinics/clinic-home-content"
import { Skeleton } from "@/components/ui/skeleton"
import { resolveTenant } from "@/lib/clinics/tenant"

/**
 * Overrides the platform's static metadata on a clinic's own domain. Without
 * this the browser tab, bookmarks, and social share previews for a clinic's
 * site all read "Aurora Organics", which defeats the point of white-labelling.
 */
export async function generateMetadata(): Promise<Metadata> {
  const result = await resolveTenant()
  if (result.kind !== "tenant") return {}

  const { displayName } = result.tenant.branding
  const title = `${displayName} | Skin scan`
  const description = `Take one photo and get a clear, personalized read on your skin, with guidance from ${displayName}.`

  return {
    // `absolute` escapes the root layout's "%s | Aurora Organics" template,
    // which would otherwise re-append the platform name to a clinic's title.
    title: { absolute: title },
    description,
    // The platform layout sets these too, so they are restated rather than
    // inherited — otherwise the Aurora values would survive underneath.
    openGraph: { title, description },
    twitter: { title, description },
    appleWebApp: { title: displayName },
  }
}

/**
 * A clinic's front door, served at the bare root of its subdomain via a rewrite
 * in proxy.ts. Reachable only that way: on the platform host there is no tenant
 * to render, so ClinicHomeContent 404s rather than exposing an empty shell.
 */
export default function ClinicHomePage() {
  return (
    <main className="bg-background text-foreground min-h-svh">
      <Suspense
        fallback={
          <div className="flex min-h-svh items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6">
              <Skeleton className="mx-auto h-10 w-48" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          </div>
        }
      >
        <ClinicHomeContent />
      </Suspense>
    </main>
  )
}
