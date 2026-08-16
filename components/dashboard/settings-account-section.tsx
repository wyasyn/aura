import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { requireAuthContext } from "@/lib/auth/context"
import { auth } from "@/lib/auth/server"

export async function SettingsAccountSection() {
  const ctx = await requireAuthContext()

  return (
    <section className="rounded-xl border border-border/60 p-5">
      <h2 className="font-heading text-sm font-medium">Account</h2>
      <p className="mt-2 text-sm text-muted-foreground">{ctx.user.email}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <form
          action={async () => {
            "use server"
            await auth.api.signOut({ headers: await headers() })
            redirect("/login")
          }}
        >
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
        <Button asChild variant="secondary">
          <Link href="/forgot-password">Reset password</Link>
        </Button>
      </div>
    </section>
  )
}
