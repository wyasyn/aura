import { redirect } from "next/navigation"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { resolveAuth } from "@/lib/auth/context"
import { getWorkspaceCapabilities } from "@/lib/dashboard/capabilities"

export async function AffiliateAuthGate({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const result = await resolveAuth()

  if (result.kind === "db_unavailable") {
    return <AuthUnavailable />
  }

  if (result.kind === "guest") {
    redirect("/login")
  }

  // Checked against an approved AffiliateProfile rather than the role field.
  // Role holds one value, so an admin or clinic manager who is also an approved
  // affiliate would be bounced to the application page for a programme they are
  // already in — and the workspace switcher, which reads the same capability,
  // would still be offering them the view this gate refused.
  const capabilities = await getWorkspaceCapabilities(
    result.context.userId,
    result.context.role,
  )

  if (!capabilities.isAffiliate) {
    redirect("/dashboard/affiliate-application")
  }

  return children
}
