import { redirect } from "next/navigation"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { resolveAuth } from "@/lib/auth/context"

export async function AdminAuthGate({
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

  if (result.context.role !== "admin") {
    redirect("/dashboard")
  }

  return children
}
