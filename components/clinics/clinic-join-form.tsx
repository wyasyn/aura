"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { acceptClinicInvitationAction } from "@/lib/clinics/member-actions"

export function ClinicJoinForm({
  invitationId,
  clinicName,
}: {
  invitationId: string
  clinicName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function accept() {
    startTransition(async () => {
      try {
        await acceptClinicInvitationAction({ invitationId })
        toast.success(`You've joined ${clinicName}`)
        router.push("/clinic")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not accept invitation")
      }
    })
  }

  return (
    <Button size="lg" className="w-full" disabled={pending} onClick={accept}>
      {pending ? "Joining…" : `Join ${clinicName}`}
    </Button>
  )
}
