"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  openClinicBillingPortalAction,
  startClinicCheckoutAction,
} from "@/lib/clinics/billing-actions"
import { formatMoneyCents } from "@/lib/payments/format"

export type BillingPlanOption = {
  id: string
  name: string
  description: string | null
  priceCents: number
  interval: string
  seatLimit: number
  monthlyScanQuota: number
  isCurrent: boolean
}

export function ClinicBilling({
  statusLabel,
  entitled,
  inGrace,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  hasStripeCustomer,
  canManage,
  plans,
}: {
  statusLabel: string
  entitled: boolean
  inGrace: boolean
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
  canManage: boolean
  plans: BillingPlanOption[]
}) {
  const [pending, startTransition] = useTransition()

  function subscribe(planId: string) {
    startTransition(async () => {
      try {
        const { url } = await startClinicCheckoutAction({ planId })
        window.location.href = url
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start checkout")
      }
    })
  }

  function manage() {
    startTransition(async () => {
      try {
        const { url } = await openClinicBillingPortalAction()
        window.location.href = url
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not open billing")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel space-y-3 rounded-xl border border-border/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">Subscription</p>
          <Badge variant={entitled ? "default" : "secondary"}>{statusLabel}</Badge>
          {cancelAtPeriodEnd ? <Badge variant="outline">cancels at period end</Badge> : null}
        </div>

        {inGrace ? (
          <p className="text-destructive text-sm">
            Your last payment failed and Stripe is retrying it. Your site is still
            live for now — update your payment method to avoid interruption.
          </p>
        ) : null}

        {!entitled ? (
          <p className="text-muted-foreground text-sm">
            Your clinic site is not live. Choose a plan below to activate it.
          </p>
        ) : null}

        {currentPeriodEnd ? (
          <p className="text-muted-foreground text-sm">
            Current period ends {currentPeriodEnd}.
          </p>
        ) : null}

        {canManage && hasStripeCustomer ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={manage}>
            {pending ? "Opening…" : "Manage billing"}
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Plans
        </p>

        {plans.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
            No plans are available for self-service checkout yet. Contact the
            Aurora team to set your clinic up.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="surface-panel space-y-3 rounded-xl border border-border/60 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{plan.name}</p>
                  {plan.isCurrent ? <Badge>current</Badge> : null}
                </div>

                <p className="font-heading text-2xl font-medium tabular-nums">
                  {formatMoneyCents(plan.priceCents)}
                  <span className="text-muted-foreground text-sm font-normal">
                    /{plan.interval}
                  </span>
                </p>

                {plan.description ? (
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                ) : null}

                <p className="text-muted-foreground text-xs">
                  {plan.seatLimit} seat{plan.seatLimit === 1 ? "" : "s"} ·{" "}
                  {plan.monthlyScanQuota < 0
                    ? "unlimited scans"
                    : `${plan.monthlyScanQuota} scans / month`}
                </p>

                {canManage ? (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={pending || plan.isCurrent}
                    onClick={() => subscribe(plan.id)}
                  >
                    {plan.isCurrent ? "Current plan" : "Choose plan"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!canManage ? (
          <p className="text-muted-foreground text-sm">
            Only clinic owners and admins can change the subscription.
          </p>
        ) : null}
      </div>
    </div>
  )
}
