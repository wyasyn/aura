"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconCheck, IconPencil, IconPlus, IconX } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  UNLIMITED,
  formatScanQuota,
  formatSeats,
  isUnlimited,
} from "@/lib/clinics/plan-limits"
import { formatMoneyCents } from "@/lib/payments/format"
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
  // Only one form is open at a time, so the page reads as a list of plans
  // rather than a stack of every field for every plan at once.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const editing = plans.find((plan) => plan.id === editingId) ?? null

  if (editing) {
    return (
      <PlanForm
        planId={editing.id}
        initial={toDraft(editing)}
        onDone={() => setEditingId(null)}
      />
    )
  }

  if (creating) {
    return <PlanForm initial={EMPTY_DRAFT} onDone={() => setCreating(false)} />
  }

  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
          No plans yet. Create one to let clinics subscribe.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setEditingId(plan.id)}
            />
          ))}
        </div>
      )}

      <Button variant="outline" onClick={() => setCreating(true)}>
        <IconPlus className="size-4" />
        New plan
      </Button>
    </div>
  )
}

function PlanCard({ plan, onEdit }: { plan: ClinicPlanRow; onEdit: () => void }) {
  return (
    <div className="surface-panel flex flex-col gap-4 rounded-xl border border-border/60 p-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{plan.name}</p>
          {!plan.isActive ? <Badge variant="secondary">inactive</Badge> : null}
        </div>
        {plan.description ? (
          <p className="text-muted-foreground text-sm">{plan.description}</p>
        ) : null}
      </div>

      <p className="font-heading text-3xl font-medium tabular-nums">
        {formatMoneyCents(plan.priceCents)}
        <span className="text-muted-foreground text-sm font-normal">
          /{plan.interval}
        </span>
      </p>

      <ul className="text-muted-foreground space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <IconCheck className="text-primary size-4 shrink-0" />
          {formatSeats(plan.seatLimit)}
        </li>
        <li className="flex items-center gap-2">
          <IconCheck className="text-primary size-4 shrink-0" />
          {formatScanQuota(plan.monthlyScanQuota)}
        </li>
        <li className="flex items-center gap-2">
          {plan.stripePriceId ? (
            <>
              <IconCheck className="text-primary size-4 shrink-0" />
              Clinics can subscribe themselves
            </>
          ) : (
            <>
              <IconX className="size-4 shrink-0 opacity-60" />
              Admin assignment only
            </>
          )}
        </li>
      </ul>

      <Button
        variant="outline"
        size="sm"
        className="mt-auto w-full"
        onClick={onEdit}
      >
        <IconPencil className="size-4" />
        Edit
      </Button>
    </div>
  )
}

function PlanForm({
  planId,
  initial,
  onDone,
}: {
  planId?: string
  initial: Draft
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState<Draft>(initial)

  const isNew = !planId
  // Changing the amount creates a new Stripe price on save, because Stripe
  // prices are immutable. Said before saving rather than discovered after.
  const priceChanged = draft.priceDollars !== initial.priceDollars

  const fieldId = (name: string) => `${name}-${planId ?? "new"}`

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
        router.refresh()
        onDone()
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
        onDone()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete plan")
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="surface-panel space-y-5 rounded-xl border border-border/60 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">
          {isNew ? "New plan" : `Edit ${initial.name}`}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          <IconX className="size-4" />
          Cancel
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={fieldId("name")}>Name</Label>
          <Input
            id={fieldId("name")}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Clinic Pro"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("price")}>Price</Label>
          <Input
            id={fieldId("price")}
            type="number"
            min={0}
            step={1}
            value={draft.priceDollars}
            onChange={(e) => set("priceDollars", Number(e.target.value) || 0)}
          />
          {priceChanged && !isNew ? (
            <p className="text-muted-foreground text-xs">
              Saving creates a new Stripe price — prices cannot be edited once
              created.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("interval")}>Interval</Label>
          <select
            id={fieldId("interval")}
            value={draft.interval}
            onChange={(e) => set("interval", e.target.value as "month" | "year")}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        {/*
          Unlimited is stored as -1, but nobody should have to know that. The
          checkbox writes the sentinel and the number input is hidden while it
          is on, so a plan cannot keep a stale figure that still reads as a
          real limit.
        */}
        <div className="space-y-2">
          <Label>Seats</Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isUnlimited(draft.seatLimit)}
              onChange={(e) => set("seatLimit", e.target.checked ? UNLIMITED : 5)}
            />
            Unlimited
          </label>
          {!isUnlimited(draft.seatLimit) ? (
            <Input
              type="number"
              min={1}
              aria-label="Seat limit"
              value={draft.seatLimit}
              onChange={(e) => set("seatLimit", Number(e.target.value) || 1)}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Monthly scans</Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isUnlimited(draft.monthlyScanQuota)}
              onChange={(e) =>
                set("monthlyScanQuota", e.target.checked ? UNLIMITED : 500)
              }
            />
            Unlimited
          </label>
          {!isUnlimited(draft.monthlyScanQuota) ? (
            <Input
              type="number"
              min={0}
              aria-label="Monthly scan quota"
              value={draft.monthlyScanQuota}
              onChange={(e) => set("monthlyScanQuota", Number(e.target.value) || 0)}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("sort")}>Sort order</Label>
          <Input
            id={fieldId("sort")}
            type="number"
            min={0}
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor={fieldId("desc")}>Description</Label>
          <Input
            id={fieldId("desc")}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="For a growing clinic with a small team."
          />
        </div>

        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor={fieldId("stripe")}>Stripe price ID</Label>
          <Input
            id={fieldId("stripe")}
            value={draft.stripePriceId}
            onChange={(e) => set("stripePriceId", e.target.value)}
            placeholder="Created automatically on save"
          />
          <p className="text-muted-foreground text-xs">
            Managed for you. Set it only to point at a specific existing Stripe
            price.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          Active
        </label>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Create plan" : "Save changes"}
        </Button>

        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
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
