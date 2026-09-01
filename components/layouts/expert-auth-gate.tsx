import { redirect } from "next/navigation"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { resolveAuth } from "@/lib/auth/context"
import { getWorkspaceCapabilities } from "@/lib/dashboard/capabilities"

export async function ExpertAuthGate({
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

  // Keyed to an approved ExpertProfile, not the role field. Role holds one
  // value, so a clinician who is also an admin would be refused the expert
  // view that the workspace switcher — reading this same capability — offers.
  const capabilities = await getWorkspaceCapabilities(
    result.context.userId,
    result.context.role,
  )

  if (!capabilities.isExpert) {
    redirect("/dashboard/expert-application")
  }

  return children
}
