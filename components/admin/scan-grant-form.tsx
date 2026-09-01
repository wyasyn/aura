"use client"

import { useMemo, useState, useTransition } from "react"

import type { ScanGrantUser } from "@/components/admin/scan-grant-panel"
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
import { grantAdminScansAction } from "@/lib/admin/actions"
import { SCAN_TIER_LABELS, SCAN_TIERS } from "@/lib/models/types"

function formatUserLabel(user: ScanGrantUser): string {
  const name = user.name?.trim() || "Unnamed"
  const tier = SCAN_TIER_LABELS[user.scanTier]
  return `${name} — ${user.email} (${user.remaining} scans · ${tier})`
}

function formatPackPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ScanGrantForm({
  users,
  packs,
}: {
  users: ScanGrantUser[]
  packs: {
    id: string
    label: string
    tier: (typeof SCAN_TIERS)[number]
    scanCount: number
    priceCents: number
  }[]
}) {
  const [userId, setUserId] = useState("")
  const [mode, setMode] = useState<"custom" | "pack">("pack")
  const [packId, setPackId] = useState(packs[0]?.id ?? "")
  const [amount, setAmount] = useState("3")
  const [tier, setTier] = useState<(typeof SCAN_TIERS)[number]>("starter")
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedUser = useMemo(
    () => users.find((user) => user.id === userId),
    [users, userId],
  )

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === packId),
    [packs, packId],
  )

  return (
    <form
      className="w-full space-y-4 rounded-xl border border-border/60 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!userId) return

        startTransition(async () => {
          try {
            if (mode === "pack" && packId) {
              await grantAdminScansAction({
                userId,
                amount: selectedPack?.scanCount ?? 1,
                packId,
                reason,
              })
            } else {
              await grantAdminScansAction({
                userId,
                amount: Number.parseInt(amount, 10),
                tier,
                reason,
              })
            }
            setMessage("Scans granted successfully.")
            setAmount("3")
            setReason("")
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Grant failed")
          }
        })
      }}
    >
      <h2 className="font-heading text-lg font-medium">Grant scans</h2>
      <div className="space-y-2">
        <Label htmlFor="userId">User</Label>
        <Select value={userId} onValueChange={setUserId} required>
          <SelectTrigger id="userId" className="w-full">
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {formatUserLabel(user)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedUser ? (
          <p className="text-sm text-muted-foreground">
            {selectedUser.remaining} scans remaining ·{" "}
            {SCAN_TIER_LABELS[selectedUser.scanTier]} tier
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Grant type</Label>
        <Select
          value={mode}
          onValueChange={(value) => setMode(value as "custom" | "pack")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pack">Scan pack (sets tier + balance)</SelectItem>
            <SelectItem value="custom">Custom amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "pack" ? (
        <div className="space-y-2">
          <Label htmlFor="packId">Pack</Label>
          <Select value={packId} onValueChange={setPackId} required>
            <SelectTrigger id="packId" className="w-full">
              <SelectValue placeholder="Select a pack" />
            </SelectTrigger>
            <SelectContent>
              {packs.map((pack) => (
                <SelectItem key={pack.id} value={pack.id}>
                  {pack.label} — {formatPackPrice(pack.priceCents)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="tier">Tier (replaces balance when set)</Label>
            <Select
              value={tier}
              onValueChange={(value) =>
                setTier(value as (typeof SCAN_TIERS)[number])
              }
            >
              <SelectTrigger id="tier" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCAN_TIERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SCAN_TIER_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Scans</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending || !userId}>
        {pending ? "Granting…" : "Grant scans"}
      </Button>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </form>
  )
}
