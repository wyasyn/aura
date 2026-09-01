"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClinicAction } from "@/lib/admin/clinic-actions"

export type PlanOption = { id: string; name: string }

export function ClinicCreateForm({ plans }: { plans: PlanOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [subdomain, setSubdomain] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [planId, setPlanId] = useState("")
  const [compAccess, setCompAccess] = useState(true)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await createClinicAction({
          name,
          subdomain,
          displayName: displayName || undefined,
          ownerEmail,
          planId: planId || undefined,
          compAccess,
        })
        toast.success(`Clinic provisioned at ${result.subdomain}`)
        setName("")
        setSubdomain("")
        setDisplayName("")
        setOwnerEmail("")
        setPlanId("")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create clinic")
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border/60 p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clinic-name">Clinic or brand name</Label>
          <Input
            id="clinic-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wellderm Skin Clinic"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clinic-subdomain">Subdomain</Label>
          <Input
            id="clinic-subdomain"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
            placeholder="wellderm"
            required
          />
          <p className="text-muted-foreground text-xs">
            Serves the clinic at this subdomain. Lowercase letters, numbers, and
            hyphens.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clinic-display-name">Display name</Label>
          <Input
            id="clinic-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Defaults to the clinic name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clinic-owner">Owner email</Label>
          <Input
            id="clinic-owner"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@clinic.com"
            required
          />
          <p className="text-muted-foreground text-xs">
            Must already have an Aurora account. They become the clinic owner.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clinic-plan">Plan</Label>
          <select
            id="clinic-plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="">No plan yet</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Sets the seat limit and monthly scan quota.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
        <input
          type="checkbox"
          checked={compAccess}
          onChange={(e) => setCompAccess(e.target.checked)}
          className="mt-0.5 size-4"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">
            Activate now without Stripe billing
          </span>
          <span className="text-muted-foreground block text-xs">
            For enterprise agreements billed outside the app, and for trials.
            Leave unchecked and the clinic&apos;s site stays dark until it
            completes Stripe checkout itself.
          </span>
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Provisioning…" : "Provision clinic"}
      </Button>
    </form>
  )
}
