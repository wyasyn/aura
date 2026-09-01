import { Suspense } from "react"
import { redirect } from "next/navigation"

import { AuthUnavailable } from "@/components/auth/auth-unavailable"
import { resolveAuth } from "@/lib/auth/context"

async function AuthGuestGate({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const result = await resolveAuth()

  if (result.kind === "db_unavailable") {
    return <AuthUnavailable />
  }

  if (result.kind === "authenticated") {
    redirect("/scan")
  }

  return children
}

function AuthGuestFallback() {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
      Loading…
    </div>
  )
}

export function AuthGuestShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<AuthGuestFallback />}>
      <AuthGuestGate>{children}</AuthGuestGate>
    </Suspense>
  )
}
