"use client"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"

export function ImpersonationBanner() {
  return (
    <div className="flex items-center justify-between border-b border-border bg-muted px-6 py-2 text-sm">
      <span>You are impersonating a user.</span>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await authClient.admin.stopImpersonating()
          window.location.href = "/admin"
        }}
      >
        Stop impersonating
      </Button>
    </div>
  )
}
