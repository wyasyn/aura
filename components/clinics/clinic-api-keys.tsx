"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createClinicApiKeyAction,
  revokeClinicApiKeyAction,
} from "@/lib/clinics/api-key-actions"

export type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

export function ClinicApiKeys({
  keys,
  canManage,
  apiBaseUrl,
}: {
  keys: ApiKeyRow[]
  canManage: boolean
  apiBaseUrl: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [issued, setIssued] = useState<{ name: string; plaintext: string } | null>(
    null,
  )

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await createClinicApiKeyAction({ name })
        setIssued(result)
        setName("")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create key")
      }
    })
  }

  function onRevoke(apiKeyId: string) {
    startTransition(async () => {
      try {
        await revokeClinicApiKeyAction({ apiKeyId })
        toast.success("Key revoked")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not revoke key")
      }
    })
  }

  return (
    <div className="space-y-6">
      {issued ? (
        <div className="border-primary/40 bg-primary/5 space-y-3 rounded-xl border p-5">
          <p className="font-medium">Copy your key now</p>
          <p className="text-muted-foreground text-sm">
            This is the only time <strong>{issued.name}</strong> will be shown.
            It is stored hashed, so it cannot be recovered later — if you lose
            it, revoke the key and create another.
          </p>
          <code className="block rounded-lg border border-border/60 bg-background p-3 font-mono text-sm break-all">
            {issued.plaintext}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(issued.plaintext)
                toast.success("Copied")
              }}
            >
              Copy key
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIssued(null)}>
              I&apos;ve saved it
            </Button>
          </div>
        </div>
      ) : null}

      {canManage ? (
        <form
          onSubmit={onCreate}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 p-5"
        >
          <div className="min-w-56 flex-1 space-y-2">
            <Label htmlFor="api-key-name">Create an API key</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Practice management integration"
              required
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create key"}
          </Button>
        </form>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Keys
        </p>
        {keys.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
            No API keys yet.
          </div>
        ) : (
          <ul className="divide-border divide-y rounded-xl border border-border/60">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{key.name}</p>
                    {key.revokedAt ? (
                      <Badge variant="destructive">revoked</Badge>
                    ) : (
                      <Badge>active</Badge>
                    )}
                  </div>
                  <code className="text-muted-foreground text-xs">
                    {key.keyPrefix}…
                  </code>
                  <p className="text-muted-foreground text-xs">
                    {key.lastUsedAt
                      ? `Last used ${key.lastUsedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}`
                      : "Never used"}
                  </p>
                </div>

                {canManage && !key.revokedAt ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => onRevoke(key.id)}
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 p-5">
        <p className="font-medium">Using the API</p>
        <p className="text-muted-foreground text-sm">
          Send your key as a bearer token. Requests are limited to 120 per
          minute per key, and only ever return your own clinic&apos;s data.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted p-3 text-xs">
          {`curl ${apiBaseUrl}/api/v1/scans \\
  -H "Authorization: Bearer aur_sk_..."`}
        </pre>
        <ul className="text-muted-foreground space-y-1 text-xs">
          <li>
            <code>GET /api/v1/clinic</code> — your clinic profile and usage
          </li>
          <li>
            <code>GET /api/v1/scans</code> — scans, cursor paginated
          </li>
          <li>
            <code>GET /api/v1/scans/:id</code> — one scan with its assessment
          </li>
        </ul>
      </div>
    </div>
  )
}
