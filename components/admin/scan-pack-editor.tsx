"use client"

import { useState, useTransition } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createScanPackAction,
  updateScanPackAction,
} from "@/lib/admin/scan-pack-actions"
import { SCAN_TIER_LABELS, SCAN_TIERS, type ScanTier } from "@/lib/models/types"
import { formatMoneyCents } from "@/lib/payments/format"
import type { ScanPackFormInput } from "@/lib/scans/pack-schemas"
import { cn } from "@/lib/utils"

export type ScanPackRecord = {
  id: string
  tier: ScanTier
  label: string
  scanCount: number
  priceCents: number
  isActive: boolean
  sortOrder: number
}

const EMPTY_FORM: ScanPackFormInput = {
  tier: "starter",
  label: "",
  scanCount: 5,
  priceCents: 500,
  isActive: true,
  sortOrder: 0,
}

function mapRecordToForm(record: ScanPackRecord): ScanPackFormInput {
  return {
    tier: record.tier,
    label: record.label,
    scanCount: record.scanCount,
    priceCents: record.priceCents,
    isActive: record.isActive,
    sortOrder: record.sortOrder,
  }
}

export function ScanPackEditor({
  packs,
  currency = "USD",
}: {
  packs: ScanPackRecord[]
  currency?: string
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [pageTab, setPageTab] = useState("packs")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ScanPackFormInput>(EMPTY_FORM)

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMessage(null)
  }

  function startEdit(pack: ScanPackRecord) {
    setEditingId(pack.id)
    setForm(mapRecordToForm(pack))
    setMessage(null)
    setPageTab("configure")
  }

  return (
    <Tabs value={pageTab} onValueChange={setPageTab} variant="underline" className="w-full">
      <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
        <TabsTrigger value="packs">Scan packs</TabsTrigger>
        <TabsTrigger value="configure">
          {editingId ? "Edit pack" : "Add pack"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="packs">
        <div className="rounded-xl border border-border/60">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-heading text-sm font-medium">Configured packs</h2>
          </div>
          <ul className="divide-y divide-border">
            {packs.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                No scan packs configured yet.
              </li>
            ) : (
              packs.map((pack) => (
                <li
                  key={pack.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{pack.label}</p>
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {SCAN_TIER_LABELS[pack.tier]}
                      </span>
                      {!pack.isActive ? (
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Inactive
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pack.scanCount} scans ·{" "}
                      {formatMoneyCents(pack.priceCents, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sort order {pack.sortOrder}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(pack)}
                  >
                    Edit
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
        {message && pageTab === "packs" ? (
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        ) : null}
      </TabsContent>

      <TabsContent value="configure">
        <form
          className="space-y-4 rounded-xl border border-border/60 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            startTransition(async () => {
              try {
                if (editingId) {
                  await updateScanPackAction(editingId, form)
                  setMessage("Pack updated.")
                } else {
                  await createScanPackAction(form)
                  setMessage("Pack added.")
                }
                resetForm()
                setPageTab("packs")
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Save failed")
              }
            })
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-medium">
              {editingId ? "Edit pack" : "Add pack"}
            </h2>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pack-tier">Tier</Label>
              <Select
                value={form.tier}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, tier: value as ScanTier }))
                }
              >
                <SelectTrigger id="pack-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCAN_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {SCAN_TIER_LABELS[tier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-label">Label</Label>
              <Input
                id="pack-label"
                value={form.label}
                onChange={(e) =>
                  setForm((current) => ({ ...current, label: e.target.value }))
                }
                placeholder="10 Starter scans"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-scanCount">Scan count</Label>
              <Input
                id="pack-scanCount"
                type="number"
                min={1}
                value={form.scanCount}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    scanCount: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-priceCents">Price (cents)</Label>
              <Input
                id="pack-priceCents"
                type="number"
                min={0}
                value={form.priceCents}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    priceCents: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                {formatMoneyCents(form.priceCents || 0, currency)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-sortOrder">Sort order</Label>
              <Input
                id="pack-sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, isActive: checked === true }))
              }
            />
            Active (visible for purchase)
          </label>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editingId ? "Update pack" : "Add pack"}
          </Button>
          {message && pageTab === "configure" ? (
            <p className={cn("text-sm", "text-muted-foreground")}>{message}</p>
          ) : null}
        </form>
      </TabsContent>
    </Tabs>
  )
}
