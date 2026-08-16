"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconLock } from "@tabler/icons-react"

import { UpgradeGateDialog } from "@/components/billing/upgrade-gate-dialog"
import { Button } from "@/components/ui/button"
import { BILLING_HREF } from "@/lib/billing/constants"

/**
 * Stands in for the scan wizard when the user has no scans left. Declining
 * returns them to wherever they came from rather than stranding them on a
 * route they cannot use. The panel behind the dialog carries the same two
 * actions, so a dismissed dialog never leaves a dead-end screen.
 */
export function ScanAccessGate({ returnHref }: { returnHref: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [pending, startTransition] = useTransition()

  function onCancel() {
    setOpen(false)
    startTransition(() => {
      router.push(returnHref)
    })
  }

  return (
    <>
      <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <IconLock className="size-5" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-xl font-medium">
            Scanning needs an active plan
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your scan allowance is used up. Existing reports and chats stay
            available in your dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => router.push(BILLING_HREF)}>View plans</Button>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Go back
          </Button>
        </div>
      </div>

      <UpgradeGateDialog open={open} feature="scan" onCancel={onCancel} />
    </>
  )
}
