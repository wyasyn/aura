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
  assignModelToTierAction,
  createModelRateAction,
  updateModelRateAction,
} from "@/lib/models/actions"
import type { ModelRateFormInput } from "@/lib/models/schemas"
import {
  SCAN_TIER_LABELS,
  SCAN_TIERS,
  THINKING_LEVELS,
  type ScanTier,
  type ThinkingLevel,
} from "@/lib/models/types"
import { cn } from "@/lib/utils"

export type ModelRateRecord = {
  id: string
  provider: ModelRateFormInput["provider"]
  modelId: string
  displayName: string | null
  inputMicrosPer1M: number
  outputMicrosPer1M: number
  cachedInputMicrosPer1M: number
  isActive: boolean
  isScanDefault: boolean
  supportsVision: boolean
  supportsLive: boolean
  assignedTier: ScanTier | null
  thinkingLevel: string | null
}

const EMPTY_FORM: ModelRateFormInput = {
  provider: "gemini",
  modelId: "",
  displayName: "",
  inputMicrosPer1M: 150_000,
  outputMicrosPer1M: 600_000,
  cachedInputMicrosPer1M: 37_500,
  isActive: true,
  supportsVision: true,
  supportsLive: false,
  thinkingLevel: null,
}

function mapRecordToForm(record: ModelRateRecord): ModelRateFormInput {
  return {
    provider: record.provider,
    modelId: record.modelId,
    displayName: record.displayName ?? "",
    inputMicrosPer1M: record.inputMicrosPer1M,
    outputMicrosPer1M: record.outputMicrosPer1M,
    cachedInputMicrosPer1M: record.cachedInputMicrosPer1M,
    isActive: record.isActive,
    supportsVision: record.supportsVision,
    supportsLive: record.supportsLive,
    thinkingLevel: (record.thinkingLevel as ThinkingLevel | null) ?? null,
  }
}

function formatUsdPer1M(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(4)}`
}

function tierLabel(tier: ScanTier | null): string {
  if (!tier) return "Unassigned"
  return tier === "pro" ? "Pro (live)" : SCAN_TIER_LABELS[tier]
}

export function ModelRateEditor({
  models,
}: {
  models: ModelRateRecord[]
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [pageTab, setPageTab] = useState("models")
  const [formTab, setFormTab] = useState("identity")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ModelRateFormInput>(EMPTY_FORM)

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormTab("identity")
    setMessage(null)
  }

  function startEdit(model: ModelRateRecord) {
    setEditingId(model.id)
    setForm(mapRecordToForm(model))
    setFormTab("identity")
    setMessage(null)
    setPageTab("configure")
  }

  return (
    <Tabs value={pageTab} onValueChange={setPageTab} variant="underline" className="w-full">
      <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
        <TabsTrigger value="models">Models</TabsTrigger>
        <TabsTrigger value="configure">
          {editingId ? "Edit model" : "Add model"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="models">
        <div className="rounded-xl border border-border/60">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-heading text-sm font-medium">Configured models</h2>
          </div>
          <ul className="divide-y divide-border">
            {models.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                No models configured yet.
              </li>
            ) : (
              models.map((model) => (
                <li
                  key={model.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {model.displayName ?? model.modelId}
                      </p>
                      {model.assignedTier ? (
                        <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {tierLabel(model.assignedTier)}
                        </span>
                      ) : null}
                      {model.supportsLive ? (
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Live API
                        </span>
                      ) : null}
                      {model.thinkingLevel ? (
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Thinking: {model.thinkingLevel}
                        </span>
                      ) : null}
                      {!model.isActive ? (
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Inactive
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {model.provider} · {model.modelId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In {formatUsdPer1M(model.inputMicrosPer1M)} · Out{" "}
                      {formatUsdPer1M(model.outputMicrosPer1M)} · Cached{" "}
                      {formatUsdPer1M(model.cachedInputMicrosPer1M)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={model.assignedTier ?? "none"}
                      onValueChange={(value) => {
                        startTransition(async () => {
                          try {
                            await assignModelToTierAction(model.id, {
                              tier:
                                value === "none" ? null : (value as ScanTier),
                            })
                            setMessage("Tier assignment updated.")
                          } catch (err) {
                            setMessage(
                              err instanceof Error ? err.message : "Update failed",
                            )
                          }
                        })
                      }}
                    >
                      <SelectTrigger className="w-[160px]" size="sm">
                        <SelectValue placeholder="Assign tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {SCAN_TIERS.map((tier) => (
                          <SelectItem key={tier} value={tier}>
                            {tier === "pro" ? "Pro (live)" : SCAN_TIER_LABELS[tier]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(model)}
                    >
                      Edit
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        {message && pageTab === "models" ? (
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
                  await updateModelRateAction(editingId, form)
                  setMessage("Model updated.")
                } else {
                  await createModelRateAction(form)
                  setMessage("Model added.")
                }
                resetForm()
                setPageTab("models")
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Save failed")
              }
            })
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-medium">
              {editingId ? "Edit model" : "Add model"}
            </h2>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <Tabs value={formTab} onValueChange={setFormTab} variant="underline">
            <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            </TabsList>

            <TabsContent value="identity">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={form.provider}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        provider: value as ModelRateFormInput["provider"],
                      }))
                    }
                  >
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">gemini</SelectItem>
                      <SelectItem value="vercel_ai">vercel_ai</SelectItem>
                      <SelectItem value="openrouter">openrouter</SelectItem>
                      <SelectItem value="other">other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelId">Model ID</Label>
                  <Input
                    id="modelId"
                    value={form.modelId}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, modelId: e.target.value }))
                    }
                    placeholder="gemini-2.5-flash"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={form.displayName}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        displayName: e.target.value,
                      }))
                    }
                    placeholder="Gemini 2.5 Flash"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inputMicros">Input micro-USD / 1M tokens</Label>
                  <Input
                    id="inputMicros"
                    type="number"
                    min={1}
                    value={form.inputMicrosPer1M}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        inputMicrosPer1M: Number.parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputMicros">Output micro-USD / 1M tokens</Label>
                  <Input
                    id="outputMicros"
                    type="number"
                    min={1}
                    value={form.outputMicrosPer1M}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        outputMicrosPer1M: Number.parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cachedMicros">Cached input micro-USD / 1M</Label>
                  <Input
                    id="cachedMicros"
                    type="number"
                    min={0}
                    value={form.cachedInputMicrosPer1M}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        cachedInputMicrosPer1M:
                          Number.parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="capabilities">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="thinkingLevel">Thinking level</Label>
                  <Select
                    value={form.thinkingLevel ?? "none"}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        thinkingLevel:
                          value === "none" ? null : (value as ThinkingLevel),
                      }))
                    }
                  >
                    <SelectTrigger id="thinkingLevel">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {THINKING_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.isActive}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          isActive: checked === true,
                        }))
                      }
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.supportsVision}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          supportsVision: checked === true,
                        }))
                      }
                    />
                    Supports vision
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.supportsLive}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          supportsLive: checked === true,
                        }))
                      }
                    />
                    Supports Live API
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editingId ? "Update model" : "Add model"}
          </Button>
          {message && pageTab === "configure" ? (
            <p className={cn("text-sm", "text-muted-foreground")}>{message}</p>
          ) : null}
        </form>
      </TabsContent>
    </Tabs>
  )
}
