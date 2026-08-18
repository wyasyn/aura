"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { submitExpertApplicationAction } from "@/lib/experts/application-actions"
import type { ExpertApplicationInput } from "@/lib/experts/schemas"
import { EXPERT_SPECIALTIES, SPECIALTY_LABELS } from "@/lib/experts/types"

const EMPTY_FORM: ExpertApplicationInput = {
  specialty: "dermatologist",
  headline: "",
  bio: "",
  credentials: "",
  yearsExperience: 1,
  consultationPriceCents: 5000,
}

export function ExpertApplicationForm({
  initial,
}: {
  initial?: ExpertApplicationInput
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<ExpertApplicationInput>(initial ?? EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="space-y-5 rounded-xl border border-border/60 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const result = await submitExpertApplicationAction(form)
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
        <Label htmlFor="specialty">Specialty</Label>
        <Select
          value={form.specialty}
          onValueChange={(value) =>
            setForm((f) => ({
              ...f,
              specialty: value as ExpertApplicationInput["specialty"],
            }))
          }
        >
          <SelectTrigger id="specialty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPERT_SPECIALTIES.map((specialty) => (
              <SelectItem key={specialty} value={specialty}>
                {SPECIALTY_LABELS[specialty]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={form.headline}
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          placeholder="Board-certified dermatologist, 12 years in clinical practice"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          placeholder="Tell patients about your background, approach, and areas of focus."
          rows={5}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="credentials">Credentials &amp; licenses</Label>
        <Textarea
          id="credentials"
          value={form.credentials}
          onChange={(e) =>
            setForm((f) => ({ ...f, credentials: e.target.value }))
          }
          placeholder="Medical license number and issuing board, degrees, certifications."
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Reviewed by our team before your profile goes live. Not shown publicly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="yearsExperience">Years of experience</Label>
          <Input
            id="yearsExperience"
            type="number"
            min={0}
            max={80}
            value={form.yearsExperience}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                yearsExperience: Number.parseInt(e.target.value, 10) || 0,
              }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="consultationPriceCents">
            Consultation price (USD cents)
          </Label>
          <Input
            id="consultationPriceCents"
            type="number"
            min={500}
            step={100}
            value={form.consultationPriceCents}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                consultationPriceCents: Number.parseInt(e.target.value, 10) || 0,
              }))
            }
            required
          />
          <p className="text-xs text-muted-foreground">
            ${(form.consultationPriceCents / 100).toFixed(2)} per video
            consultation
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  )
}
