"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateClinicBrandingAction } from "@/lib/clinics/branding-actions"
import { contrastingForeground, normalizeHexColor } from "@/lib/clinics/branding"

export type BrandingFormValues = {
  displayName: string
  logoUrl: string
  primaryColor: string
  accentColor: string
  supportEmail: string
}

export function ClinicBrandingForm({
  initial,
  canEdit,
}: {
  initial: BrandingFormValues
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState(initial)

  function set<K extends keyof BrandingFormValues>(
    key: K,
    value: BrandingFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateClinicBrandingAction({
          displayName: values.displayName,
          logoUrl: values.logoUrl || undefined,
          primaryColor: values.primaryColor || undefined,
          accentColor: values.accentColor || undefined,
          supportEmail: values.supportEmail || undefined,
        })
        toast.success("Branding updated")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save branding")
      }
    })
  }

  const previewPrimary = normalizeHexColor(values.primaryColor) ?? undefined

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-border/60 p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brand-display-name">Display name</Label>
          <Input
            id="brand-display-name"
            value={values.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            disabled={!canEdit}
            required
          />
          <p className="text-muted-foreground text-xs">
            Shown to patients on your site, reports, and emails.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand-support-email">Support email</Label>
          <Input
            id="brand-support-email"
            type="email"
            value={values.supportEmail}
            onChange={(e) => set("supportEmail", e.target.value)}
            disabled={!canEdit}
            placeholder="care@yourclinic.com"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="brand-logo">Logo URL</Label>
          <Input
            id="brand-logo"
            value={values.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            disabled={!canEdit}
            placeholder="https://yourclinic.com/logo.png"
          />
          <p className="text-muted-foreground text-xs">
            Must be an https URL. Replaces your name in the header when set.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand-primary">Primary colour</Label>
          <div className="flex items-center gap-2">
            <Input
              id="brand-primary"
              value={values.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              disabled={!canEdit}
              placeholder="#2563eb"
            />
            <span
              aria-hidden
              className="size-9 shrink-0 rounded-md border border-border/60"
              style={{ background: previewPrimary }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Buttons and links. Text on top is picked automatically for contrast.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand-accent">Accent colour</Label>
          <div className="flex items-center gap-2">
            <Input
              id="brand-accent"
              value={values.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
              disabled={!canEdit}
              placeholder="#e0edff"
            />
            <span
              aria-hidden
              className="size-9 shrink-0 rounded-md border border-border/60"
              style={{ background: normalizeHexColor(values.accentColor) ?? undefined }}
            />
          </div>
        </div>
      </div>

      {previewPrimary ? (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Preview
          </p>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 p-4">
            <span
              className="rounded-full px-4 py-2 text-sm font-medium"
              style={{
                background: previewPrimary,
                color: contrastingForeground(previewPrimary),
              }}
            >
              Start your skin scan
            </span>
            <span className="text-muted-foreground text-xs">
              How your main button will look to patients.
            </span>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save branding"}
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">
          Only clinic owners and admins can change branding.
        </p>
      )}
    </form>
  )
}
