import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { IconSparkles } from "@tabler/icons-react"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { Button } from "@/components/ui/button"
import { DotField } from "@/components/ui/dot-field"
import { brandingStyle } from "@/lib/clinics/branding"
import { resolveTenant } from "@/lib/clinics/tenant"

/**
 * Split out of the page so the tenant lookup happens inside a Suspense
 * boundary. Resolving it in the page body blocks the whole document shell,
 * which Cache Components rejects at build time.
 */
export async function ClinicHomeContent() {
  const result = await resolveTenant()

  if (result.kind === "db_unavailable") {
    return <AuthUnavailable />
  }
  if (result.kind !== "tenant") {
    notFound()
  }

  const { tenant } = result

  // Suspended or unpaid: a neutral notice, deliberately carrying neither the
  // clinic's branding nor Aurora's, so the page neither presents the clinic as
  // live nor advertises who runs the platform underneath it.
  if (!tenant.access.ok) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="font-heading text-2xl font-medium">
            This site is temporarily unavailable
          </h1>
          <p className="text-muted-foreground text-sm">
            Please check back shortly, or contact the clinic directly.
          </p>
        </div>
      </div>
    )
  }

  const { branding } = tenant

  return (
    <div
      style={brandingStyle(branding)}
      className="relative isolate flex min-h-svh items-center justify-center p-6"
    >
      <DotField />
      <div className="w-full max-w-md space-y-6 text-center">
        {branding.logoUrl ? (
          <Image
            src={branding.logoUrl}
            alt={branding.displayName}
            width={160}
            height={48}
            className="mx-auto h-12 w-auto object-contain"
            unoptimized
          />
        ) : (
          <p className="font-display text-3xl">{branding.displayName}</p>
        )}

        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Understand your skin
          </h1>
          <p className="text-muted-foreground text-sm">
            Take one photo and get a clear, personalized read on your skin, with
            guidance from {branding.displayName}.
          </p>
        </div>

        <Button asChild size="lg" className="w-full">
          <Link href="/scan">
            <IconSparkles className="size-4" />
            Start your skin scan
          </Link>
        </Button>

        {branding.supportEmail ? (
          <p className="text-muted-foreground text-xs">
            Questions?{" "}
            <a className="underline" href={`mailto:${branding.supportEmail}`}>
              {branding.supportEmail}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  )
}
