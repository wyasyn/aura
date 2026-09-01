"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  submitDeletionRequestAction,
  type DeletionRequestState,
} from "@/lib/user/deletion-request-action"

type DeletionRequestFormProps = {
  defaultEmail?: string
  isLoggedIn?: boolean
}

const initialState: DeletionRequestState = { ok: false }

export function DeletionRequestForm({
  defaultEmail = "",
  isLoggedIn = false,
}: DeletionRequestFormProps) {
  const [state, action, pending] = useActionState(
    submitDeletionRequestAction,
    initialState,
  )

  if (state.ok) {
    return (
      <div className="border-border bg-muted/40 space-y-2 rounded-xl border p-6">
        <p className="text-foreground font-medium">Request received</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We will process your deletion request and confirm by email. This
          usually takes up to 30 days.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isLoggedIn ? (
        <div className="border-border bg-primary/5 space-y-3 rounded-xl border p-6">
          <p className="text-foreground font-medium">Delete instantly from your dashboard</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You are signed in. You can delete scans, profile data, or your entire
            account immediately from privacy settings. No need to wait for support.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/privacy">Go to privacy settings</Link>
          </Button>
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deletion-email">Email address</Label>
          <Input
            id="deletion-email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deletion-message">
            Message <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="deletion-message"
            name="message"
            rows={4}
            placeholder="Tell us if you want all data deleted or specific items removed."
          />
        </div>

        {state.error ? (
          <p className="text-destructive text-sm">{state.error}</p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Submit deletion request"}
        </Button>
      </form>
    </div>
  )
}
