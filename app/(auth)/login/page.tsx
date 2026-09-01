import { Suspense } from "react"
import type { Metadata } from "next"

import { AuthForm } from "@/components/auth/auth-form"
import { AuthGuestShell } from "@/components/layouts/auth-guest-shell"
import { tenantMetadata } from "@/lib/clinics/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return tenantMetadata("Sign in")
}

export default function LoginPage() {
  return (
    <AuthGuestShell>
      <Suspense
        fallback={
          <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
            Loading…
          </div>
        }
      >
        <AuthForm mode="sign-in" />
      </Suspense>
    </AuthGuestShell>
  )
}
