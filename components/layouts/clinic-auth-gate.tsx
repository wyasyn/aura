import { notFound, redirect } from "next/navigation"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { resolveClinicSession } from "@/lib/clinics/membership"

/**
 * Guards the clinic staff area. Lives on the clinic's own subdomain, so the
 * organization comes from the host rather than an org switcher.
 *
 * Note this does not check the subscription: a lapsed clinic still needs its
 * admins to get in and pay. Only the patient-facing site is entitlement-gated.
 */
export async function ClinicAuthGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const result = await resolveClinicSession()

  switch (result.kind) {
    case "ok":
      return children
    case "db_unavailable":
      return <AuthUnavailable />
    case "guest":
      redirect("/login")
    // Not a member, or the platform host where there is no clinic at all.
    // Both 404 rather than explaining, so the response doesn't reveal whether
    // a given subdomain belongs to a real clinic.
    case "not_a_member":
    case "no_tenant":
      notFound()
  }
}
