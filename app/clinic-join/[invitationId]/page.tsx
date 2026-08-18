import { Suspense } from "react"
import { notFound } from "next/navigation"

import { ClinicJoinForm } from "@/components/clinics/clinic-join-form"
import { Skeleton } from "@/components/ui/skeleton"
import { getAuthContext } from "@/lib/auth/context"
import { brandingStyle } from "@/lib/clinics/branding"
import { resolveTenant } from "@/lib/clinics/tenant"
import { prisma } from "@/lib/db/client"

/**
 * Invitation acceptance. Deliberately outside the /clinic route group: that
 * area's gate 404s non-members, which is exactly who is accepting an invite.
 */
export default function ClinicJoinPage({
  params,
}: {
  params: Promise<{ invitationId: string }>
}) {
  return (
    <main className="bg-background text-foreground flex min-h-svh items-center justify-center p-6">
      <Suspense fallback={<Skeleton className="h-48 w-full max-w-md rounded-xl" />}>
        <JoinContent params={params} />
      </Suspense>
    </main>
  )
}

async function JoinContent({
  params,
}: {
  params: Promise<{ invitationId: string }>
}) {
  const { invitationId } = await params
  const tenantResult = await resolveTenant()
  if (tenantResult.kind !== "tenant") notFound()

  const { tenant } = tenantResult
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      organizationId: tenant.organizationId,
      status: "pending",
    },
    select: { id: true, email: true, expiresAt: true },
  })

  if (!invitation) {
    return (
      <Notice title="This invitation is no longer valid">
        It may have been cancelled or already accepted.
      </Notice>
    )
  }
  if (invitation.expiresAt < new Date()) {
    return (
      <Notice title="This invitation has expired">
        Ask your clinic admin to send a new one.
      </Notice>
    )
  }

  const auth = await getAuthContext()

  if (!auth) {
    return (
      <Notice title={`Join ${tenant.branding.displayName}`}>
        Sign in as <strong>{invitation.email}</strong> to accept this invitation.
      </Notice>
    )
  }

  // Checked here as well as in the action so a forwarded link shows an honest
  // message rather than failing only at the point of clicking.
  if (auth.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <Notice title="This invitation is for a different account">
        It was sent to <strong>{invitation.email}</strong>, but you are signed in
        as <strong>{auth.user.email}</strong>.
      </Notice>
    )
  }

  return (
    <div
      style={brandingStyle(tenant.branding)}
      className="w-full max-w-md space-y-6 text-center"
    >
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-medium">
          Join {tenant.branding.displayName}
        </h1>
        <p className="text-muted-foreground text-sm">
          You&apos;ll be able to see patient scans taken through this clinic.
        </p>
      </div>
      <ClinicJoinForm
        invitationId={invitation.id}
        clinicName={tenant.branding.displayName}
      />
    </div>
  )
}

function Notice({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-md space-y-2 text-center">
      <h1 className="font-heading text-xl font-medium">{title}</h1>
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  )
}
