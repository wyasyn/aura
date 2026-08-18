"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  deleteClinicAction,
  previewClinicDeletionAction,
} from "@/lib/admin/clinic-offboard-actions"
import type { ClinicDeletionPreview } from "@/lib/admin/clinic-offboard"

export function ClinicDeleteDialog({
  clinicId,
  clinicName,
  open,
  onOpenChange,
}: {
  clinicId: string
  clinicName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<ClinicDeletionPreview | null>(null)
  const [confirmSubdomain, setConfirmSubdomain] = useState("")

  // Counts are loaded when the dialog opens so the warning reflects the tenant
  // as it is right now, not as it was when the page was rendered.
  useEffect(() => {
    if (!open) {
      setPreview(null)
      setConfirmSubdomain("")
      return
    }
    let cancelled = false
    previewClinicDeletionAction({ clinicId })
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load details")
        onOpenChange(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, clinicId, onOpenChange])

  function onDelete() {
    startTransition(async () => {
      try {
        const result = await deleteClinicAction({ clinicId, confirmSubdomain })
        toast.success(
          `Deleted ${result.subdomain}. ${result.detachedScans} scan(s) kept for their patients.`,
        )
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete clinic")
      }
    })
  }

  const blocked = preview?.blockedReason ?? null
  const canDelete =
    Boolean(preview) && !blocked && confirmSubdomain === preview?.subdomain

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${clinicName}?`}
      description="This permanently removes the tenant. It cannot be undone."
      className="sm:max-w-lg"
    >
      <div className="space-y-4 p-6">
        {!preview ? (
          <p className="text-muted-foreground text-sm">Loading details…</p>
        ) : (
          <>
            <ul className="space-y-1 rounded-lg border border-border/60 p-4 text-sm">
              <li>
                <strong>{preview.memberCount}</strong> staff member
                {preview.memberCount === 1 ? "" : "s"} lose access
              </li>
              <li>
                <strong>{preview.invitationCount}</strong> pending invitation
                {preview.invitationCount === 1 ? "" : "s"} are cancelled
              </li>
              <li>
                <strong>{preview.scanCount}</strong> patient scan
                {preview.scanCount === 1 ? "" : "s"} are{" "}
                <strong>detached, not deleted</strong> — each stays with the
                patient who took it
              </li>
              <li>
                The subdomain <code>{preview.subdomain}</code> stops resolving
                and becomes available again
              </li>
            </ul>

            {blocked ? (
              <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
                {blocked}
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="confirm-subdomain">
                  Type <code>{preview.subdomain}</code> to confirm
                </Label>
                <Input
                  id="confirm-subdomain"
                  value={confirmSubdomain}
                  onChange={(e) => setConfirmSubdomain(e.target.value)}
                  placeholder={preview.subdomain}
                  autoComplete="off"
                />
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            disabled={!canDelete || pending}
            onClick={onDelete}
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
