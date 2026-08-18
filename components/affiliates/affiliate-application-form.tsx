"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitAffiliateApplicationAction } from "@/lib/affiliates/application-actions"
import type { AffiliateApplicationInput } from "@/lib/affiliates/schemas"

const EMPTY_FORM: AffiliateApplicationInput = {
  howTheyPromote: "",
  website: undefined,
}

export function AffiliateApplicationForm({
  initial,
}: {
  initial?: AffiliateApplicationInput
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<AffiliateApplicationInput>(initial ?? EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="space-y-5 rounded-xl border border-border/60 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const result = await submitAffiliateApplicationAction(form)
          if (!result.ok) {
            setError(result.error)
            return
          }
          toast.success("Application submitted for review")
          router.refresh()
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="howTheyPromote">How will you promote Aurora Organics?</Label>
        <Textarea
          id="howTheyPromote"
          value={form.howTheyPromote}
          onChange={(e) =>
            setForm((f) => ({ ...f, howTheyPromote: e.target.value }))
          }
          placeholder="Instagram skincare content, a beauty blog, a newsletter, etc."
          rows={5}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website or social profile</Label>
        <Input
          id="website"
          value={form.website ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, website: e.target.value || undefined }))
          }
          placeholder="https://instagram.com/yourhandle"
        />
        <p className="text-xs text-muted-foreground">Optional, but helps review.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  )
}
