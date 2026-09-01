"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateClinicBrandingAction } from "@/lib/clinics/branding-actions"
import { contrastingForeground, normalizeHexColor } from "@/lib/clinics/branding"
import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_BYTES,
  MAX_LOGO_LABEL,
} from "@/lib/clinics/schemas"

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
  const [reading, setReading] = useState(false)

  /**
   * Reads the chosen file into a data URI. Size and type are checked here for a
   * quick answer, and again on the server, which is what actually enforces them
   * — this input can be bypassed.
   */
  function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
      toast.error("Choose a PNG, JPG, WebP or SVG image.")
      event.target.value = ""
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(`That image is ${Math.round(file.size / 1024)}KB. The limit is ${MAX_LOGO_LABEL}.`)
      event.target.value = ""
      return
    }

    setReading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setReading(false)
      if (typeof reader.result === "string") {
        set("logoUrl", reader.result)
      }
    }
    reader.onerror = () => {
      setReading(false)
      toast.error("Could not read that file.")
    }
    reader.readAsDataURL(file)
  }

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
          <Label htmlFor="brand-logo">Logo</Label>

          <div className="flex flex-wrap items-center gap-4">
            {values.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a data URI has no
              // remote host for next/image to optimise, and the size is already capped.
              <img
                src={values.logoUrl}
                alt="Your clinic logo"
                className="size-16 rounded-lg border border-border/60 bg-white object-contain p-1"
              />
            ) : (
              <div className="text-muted-foreground flex size-16 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs">
                None
              </div>
            )}

            <div className="space-y-2">
              <Input
                id="brand-logo"
                type="file"
                accept={ALLOWED_LOGO_MIME_TYPES.join(",")}
                disabled={!canEdit || reading}
                onChange={onLogoChange}
                className="max-w-xs"
              />
              {values.logoUrl && canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => set("logoUrl", "")}
                >
                  Remove logo
                </Button>
              ) : null}
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            PNG, JPG, WebP or SVG, up to {MAX_LOGO_LABEL}.
            Shown instead of your clinic name in the sidebar and on reports.
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
