"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  deleteClinicPlanAction,
  upsertClinicPlanAction,
} from "@/lib/admin/clinic-actions"

export type ClinicPlanRow = {
  id: string
  name: string
  description: string | null
  stripePriceId: string | null
  priceCents: number
  currency: string
  interval: string
  seatLimit: number
  monthlyScanQuota: number
  isActive: boolean
  sortOrder: number
}

type Draft = {
  name: string
  description: string
  stripePriceId: string
  priceDollars: number
  interval: "month" | "year"
  seatLimit: number
  monthlyScanQuota: number
  isActive: boolean
  sortOrder: number
}

function toDraft(plan: ClinicPlanRow): Draft {
  return {
    name: plan.name,
    description: plan.description ?? "",
    stripePriceId: plan.stripePriceId ?? "",
    priceDollars: plan.priceCents / 100,
    interval: plan.interval === "year" ? "year" : "month",
    seatLimit: plan.seatLimit,
    monthlyScanQuota: plan.monthlyScanQuota,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  }
}

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  stripePriceId: "",
  priceDollars: 0,
  interval: "month",
  seatLimit: 5,
  monthlyScanQuota: 100,
  isActive: true,
  sortOrder: 0,
}

export function ClinicPlansEditor({ plans }: { plans: ClinicPlanRow[] }) {
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <PlanForm key={plan.id} planId={plan.id} initial={toDraft(plan)} />
      ))}
      <PlanForm initial={EMPTY_DRAFT} />
    </div>
  )
}

function PlanForm({
  planId,
  initial,
}: {
  planId?: string
  initial: Draft
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState<Draft>(initial)

  const isNew = !planId

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await upsertClinicPlanAction({
          ...(planId ? { id: planId } : {}),
          name: draft.name,
          description: draft.description || undefined,
          stripePriceId: draft.stripePriceId || undefined,
          priceCents: Math.round(draft.priceDollars * 100),
          interval: draft.interval,
          seatLimit: draft.seatLimit,
          monthlyScanQuota: draft.monthlyScanQuota,
          isActive: draft.isActive,
          sortOrder: draft.sortOrder,
        })
        toast.success(isNew ? "Plan created" : "Plan saved")
        if (isNew) setDraft(EMPTY_DRAFT)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save plan")
      }
    })
  }

  function onDelete() {
    if (!planId) return
    startTransition(async () => {
      try {
        await deleteClinicPlanAction({ id: planId })
        toast.success("Plan deleted")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete plan")
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border/60 p-5"
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {isNew ? "New plan" : draft.name || "Plan"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Clinic Pro"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Price</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={draft.priceDollars}
            onChange={(e) => set("priceDollars", Number(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label>Interval</Label>
          <select
            value={draft.interval}
            onChange={(e) => set("interval", e.target.value as "month" | "year")}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Seat limit</Label>
          <Input
            type="number"
            min={1}
            value={draft.seatLimit}
            onChange={(e) => set("seatLimit", Number(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-2">
          <Label>Monthly scan quota</Label>
          <Input
            type="number"
            min={-1}
            value={draft.monthlyScanQuota}
            onChange={(e) => set("monthlyScanQuota", Number(e.target.value) || 0)}
          />
          <p className="text-muted-foreground text-xs">Use -1 for unlimited.</p>
        </div>

        <div className="space-y-2">
          <Label>Sort order</Label>
          <Input
            type="number"
            min={0}
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Stripe price ID</Label>
          <Input
            value={draft.stripePriceId}
            onChange={(e) => set("stripePriceId", e.target.value)}
            placeholder="price_1234…"
          />
          <p className="text-muted-foreground text-xs">
            Required before a clinic can subscribe to this plan itself. Without
            it the plan can still be assigned manually by an admin.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4"
          />
          Active
        </label>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Create plan" : "Save"}
        </Button>

        {!isNew ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  )
}
