"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  removeClinicCustomDomainAction,
  setClinicCustomDomainAction,
  verifyClinicCustomDomainAction,
} from "@/lib/clinics/domain-actions"
import {
  DOMAIN_TARGET,
  VERIFICATION_RECORD_PREFIX,
} from "@/lib/clinics/domain-constants"

export type ClinicDomainState = {
  domain: string | null
  token: string | null
  verifiedAt: Date | null
  subdomainUrl: string
}

function DnsRow({
  type,
  name,
  value,
}: {
  type: string
  name: string
  value: string
}) {
  return (
    <div className="grid gap-1 border-t border-border/60 py-3 text-sm sm:grid-cols-[6rem_1fr]">
      <span className="text-muted-foreground">{type}</span>
      <div className="space-y-1">
        <code className="block text-xs break-all">{name}</code>
        <code className="text-muted-foreground block text-xs break-all">
          {value}
        </code>
      </div>
    </div>
  )
}

export function ClinicDomain({
  state,
  canManage,
}: {
  state: ClinicDomainState
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [domain, setDomain] = useState(state.domain ?? "")

  const verified = Boolean(state.verifiedAt)

  function run(work: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await work()
        toast.success(success)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel space-y-2 rounded-xl border border-border/60 p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Always available
        </p>
        <code className="block text-sm break-all">{state.subdomainUrl}</code>
        <p className="text-muted-foreground text-xs">
          Your clinic is always reachable here, even while a custom domain is
          being set up.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => setClinicCustomDomainAction({ domain }), "Domain saved")
        }}
        className="space-y-4 rounded-xl border border-border/60 p-5"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="custom-domain">Your own domain</Label>
            {state.domain ? (
              verified ? (
                <Badge>verified</Badge>
              ) : (
                <Badge variant="secondary">pending verification</Badge>
              )
            ) : null}
          </div>
          <Input
            id="custom-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="skin.yourclinic.com"
            disabled={!canManage}
          />
          <p className="text-muted-foreground text-xs">
            A domain you own and manage at your registrar. Buy it there, then
            point it here with the records below.
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !domain.trim()}>
              {state.domain ? "Update domain" : "Add domain"}
            </Button>
            {state.domain ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() => removeClinicCustomDomainAction(), "Domain removed")
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Only clinic owners and admins can change the domain.
          </p>
        )}
      </form>

      {state.domain && state.token ? (
        <div className="space-y-3 rounded-xl border border-border/60 p-5">
          <p className="font-medium">
            {verified ? "DNS records" : "Add these at your registrar"}
          </p>
          <p className="text-muted-foreground text-sm">
            Add both records wherever you manage DNS for{" "}
            <strong>{state.domain}</strong>, then verify. Changes can take a few
            minutes to propagate.
          </p>

          <div>
            <DnsRow
              type="TXT"
              name={`${VERIFICATION_RECORD_PREFIX}.${state.domain}`}
              value={state.token}
            />
            <DnsRow type="CNAME" name={state.domain} value={DOMAIN_TARGET} />
          </div>

          {canManage && !verified ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => verifyClinicCustomDomainAction(),
                  "Domain verified — your site is live on it",
                )
              }
            >
              {pending ? "Checking DNS…" : "Verify domain"}
            </Button>
          ) : null}

          {verified ? (
            <p className="text-muted-foreground text-sm">
              Verified. Your clinic is served at{" "}
              <code className="text-xs">https://{state.domain}</code>.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Until verification passes, your site stays on the address above
              and this domain serves nothing.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
